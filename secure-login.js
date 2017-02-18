const SecureLoginApi = require("./api.js");
const SecureLoginSessionManager = require("./session.js");
const SecureLoginDatabase = require("./database.js")
const slCodes = require("./codes.js");





class SecureLogin {
	constructor() {
		this.stage = "off";
		this.db = SecureLoginDatabase;
		this.sessionManager = SecureLoginSessionManager;
		this.api = new SecureLoginApi();
	}





	run(req, res, next) {
		if (this.stage !== "on") { //DB not open. sl is not guaranteed to work.
			const err = new Error("sl: not started yet.");
			err.slCode = this.stage == slCodes[this.stage === "starting" ? "STILL_STARTING" : "NOT_STARTED" ];
			next(err);
			return;
		}

		this.sessionManager.run(req, res, () => {
			this.api.router(req, res, next);
		})
	}





	start() {
		if (this.stage !== "off") return;
		this.stage = "starting";
		this.db.start(() => {
			this.stage = "on";
		});
		return this;
	}






	set(property, value) { //set various properties of sl components,
		if (this.stage !== "off") throw new Error('sl.set: you cannot call sl.set() once sl has been started.');
		if (typeof property !== "string") throw new TypeError('sl.set: provided property is not of type string.');

		const componentSetPropertyFuncs = {
			api: this.api.setProperty.bind(this.api),
			db: this.db.setProperty.bind(this.db),
			sessions: this.sessionManager.setProperty.bind(this.sessionManager),
			hash: this.db.setProperty.bind(this.db) //database handles hashing settings
		};
		property = property.split('.');
		const setPropertyFunc = componentSetPropertyFuncs[property[0]];
		if (!setPropertyFunc) throw new ReferenceError('sl.set: "' + property[0] + '" is not an SL component. You cannot set its properties.');
		setPropertyFunc(property.slice(1), value);

		return this;
	}
}





module.exports = exports = new SecureLogin();
exports.SecureLogin = SecureLogin; //for testing purposes

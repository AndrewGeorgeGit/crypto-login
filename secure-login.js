const crypto = require('crypto');
const SecureLoginApi =require("./secure-login-api.js");

class SecureLogin {
	constructor() {
		this.bStarted = false;
		this.settings = {
			express: false,
			"iterations": 20000, //todo: make setting property
			"hash length": 64	//todo: make setting property
		}

		this.db = require("./database");
		this.sessionManager = require('./secure-login-session.js');
		this.api = new SecureLoginApi({
			'add-user': this.bundleApiFunctions(this.addUser.bind(this)),
			'remove-user': this.bundleApiFunctions(this.removeUser.bind(this), this.sessionManager.unauthenticate),
			'change-username': this.bundleApiFunctions(this.changeUsername.bind(this)),
			'change-password': this.bundleApiFunctions(this.changePassword.bind(this)),
			'login': this.bundleApiFunctions(this.authenticate.bind(this), this.sessionManager.authenticate)
		});
	}





	bundleApiFunctions(db, session) {
		let sessionFunction = () => Promise.resolve();
		if (session) { //todo: disable this function on the session end
			session.bind(this.sessionManager);
			sessionFunction = (success, req, res) => { //todo: change result to success
				let s = session.bind(this.sessionManager);
				return (success ? s(req, res) : Promise.resolve());
			}
		}

		return {
			startFunc: db,
			sessionFunc: sessionFunction
		};
	}





	start() {
		this.bStarted = true;
		this.db.start();
		return this;
	}





	//todo: disable value setting after s-l has started
	set(property, value) { //set various properties of sl components,
		if (this.bStarted) throw new Error('sl.set: you cannot call sl.set() once sl has been started.');
		if (typeof property !== "string") throw new TypeError('sl.set: property is not a string.');

		const componentSetPropertyFuncs = {
			sl: this.setProperty.bind(this), //todo: why do I have to bind?
			api: this.api.setProperty.bind(this.api),
			db: this.db.setProperty.bind(this.db), //todo: finish here
			sessions: this.sessionManager.setProperty.bind(this.sessionManager),
			hash: this.db.setProperty.bind(this.db);
		};
		property = property.split('.');
		const setPropertyFunc = componentSetPropertyFuncs[property[0]];
		if (!setPropertyFunc) throw new ReferenceError('sl.set: "' + property[0] + '" is not an SL component. You cannot set its properties.');
		setPropertyFunc(property.slice(1), value);

		return this;
	}





	setProperty(property, value) { //enable and disable functions
		switch(property[0]) {
			case 'express':
				if (typeof value !== "boolean") throw new TypeError('sl.setProperty: desired sl."' + property[0] +'" value is not of reuqired type boolean.');
				this.settings[property[0]] = value;
				this.api.setProperty(property, value); //api is also depdendent on this flag
				break;
			default:
				throw new ReferenceError('sl.setProperty: "' + property[0] + '" is not an SL property. You cannot set its value.');
				break;
		}
	}





	middleware(req, res, n = ()=>{}) {
		let next = (req, res) => {
			if (this.settings['express']) n();
			else n(req, res);
		};

		Promise.resolve()
			.then(() => this.sessionManager.attachSession(req, res))
			.then(() => this.api.router(req, res))
			.then(() => next(req, res))
			.catch((err) => {console.log(err); next(req, res);})
	}
}

module.exports = new SecureLogin();

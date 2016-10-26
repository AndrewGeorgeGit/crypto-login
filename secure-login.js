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

		this.db = require("./secure-login-database");
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
			sessions: this.sessionManager.setProperty.bind(this.sessionManager)
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





	addUser(credentials) {
		//parameter validation
		if (!('password' in credentials)) throw new Error("sl.addUser: no password provided");
		if (!('username' in credentials)) throw new Error("sl.addUser: no username provided");

		return new Promise(function (resolve, reject) {
			hash(this, null, credentials.password, (err, salt, hash) => {
				this.db.insertUser({username: credentials.username, salt: salt, hash: hash, iterations: this.settings.interations})
				       .then(result => resolve(result))
				       .catch(err => reject(err));
			});
		}.bind(this));
	}

	removeUser(credentials) {
		return this.db.deleteUser(credentials);
	}

	changeUsername(credentials) {
		return this.db.updateUsername(credentials);
	}

	changePassword(credentials) {
		//parameter validation
		if (!('newPassword' in credentials)) throw new Error("sl.changePassword: no newPassword provided");
		if (!('username' in credentials)) throw new Error("sl.changePassword: no username provided");

		return new Promise(function (resolve, reject) {
			hash(this, null, credentials.newPassword, (err, salt, hash) => {
				this.db.updatePassword({username: credentials.username, salt: salt, hash: hash, iterations: this.settings.interations})
					.then(result => resolve(result))
					.catch(err => reject(err));
			});
		}.bind(this));
	}

	authenticate(credentials) {
		return new Promise(function (resolve, reject) {
			this.db.selectUser(credentials)
				.then(row => {
					if (!row) { resolve(false); return; }
					hash(this, row.salt, credentials.password, (err, salt, hash) => {
						if (err) reject(err);
						else if (hash === row.hash) resolve(true);
						else resolve(false);
					})
				})
				.catch(err => reject(err));
		}.bind(this));
	}
}

function hash(obj, salt, msg, cb) {
	//generating random salt if necessary
	if (salt === null) {
		crypto.randomBytes(obj.settings["hash length"], (err, salt) => {
			if (err) { cb(err); return; }
			hash(obj, salt.toString("hex"), msg, cb);
		});
		return;
	}

	//type checking
	if (typeof salt === "string") {
		salt = Buffer.from(salt, "hex");
	}

	//actually hashing
	crypto.pbkdf2(msg, salt, obj.settings["iterations"], obj.settings["hash length"], "sha256", (err, msg_hash) => { //doesn't rely on db values stored
		if (err) { cb(err); return; }
		cb(null, salt.toString("hex"), msg_hash.toString("hex"));
	});
}

module.exports = new SecureLogin();
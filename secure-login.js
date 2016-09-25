const crypto = require('crypto');
const SecureLoginApi =require("./secure-login-api.js");

class SecureLogin {
	constructor() {
		this.db = require("./secure-login-database");
		this.api = new SecureLoginApi({
			'add-user': this.addUser.bind(this),
			'remove-user': this.removeUser.bind(this),
			'change-username': this.changeUsername.bind(this),
			'change-password': this.changePassword.bind(this),
			'login': this.authenticate.bind(this)
		});
		this.settings = {
			"iterations": 20000,
			"hash length": 64
		}
	}

	start() {
		this.db.start();
		return this;
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
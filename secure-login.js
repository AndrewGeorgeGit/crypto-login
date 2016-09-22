//
const crypto = require("crypto");
const SecureLoginApi = require('./secure-login-api.js');





//
function Credentials(username = null, password = null, newUsername = null, newPassword = null) {
	return {
		"username": username,
		"password": password,
		"newUsername": new_username,
		"newPassword": new_password
	}
}

//object definition
function SecureLogin() {
	this.api = new SecureLoginApi(['add-user', 'remove-user', 'change-username', 'change-password', 'login'],
		[this.addUser.bind(this), this.removeUser.bind(this), this.changeUsername.bind(this), this.changePassword.bind(this), this.authenticate.bind(this)]);
	this.db = require("./secure-login-table")();
	this.settings = {
		"iteration count": 20000,
		"hash length": 64
	}
}

SecureLogin.prototype.start = function() {
	this.db.start();
	return this;
};

SecureLogin.prototype.set = function (prop, val) {
	if (prop in this.settings) {
		if (!Number.isInteger(val)) return;
		this.settings[prop] = val;
	}
	else if (prop in this.db) {
		if (typeof val !== "string") return;
		this.db[prop] = val;
	}

	return this;
};





/*===========
User management functions
============*/
SecureLogin.prototype.addUser = function (credentials) {
	return new Promise(function (resolve, reject) {
		hash(this, null, credentials.password, (err, salt, pass_hash) => {
			if (err) reject(err);
			this.db.insertUser(credentials.username, pass_hash, salt, this.settings["iteration count"], err => {
				if (err && err.errno !== 19) reject(err);
				else resolve(err ? false : true);
			});
		});	
	}.bind(this));
}

SecureLogin.prototype.authenticate = function (credentials) {
	return new Promise(function (resolve, reject) {
		this.db.selectUser(credentials.username, (err, row) => {
			if (err) { reject(err); return; }
			else if (!row) { resolve(false); return; }
			hash(this, row[this.db["salt column"]], credentials.password, (err, salt, pass_hash) => {
				if (err) { reject(this); return; }
				resolve(pass_hash == row[this.db["password hash column"]]);
			});
		});
	}.bind(this));
		
}

SecureLogin.prototype.changeUsername = function (credentials) {
	return new Promise(function (resolve, reject) {
		this.db.updateUsername(credentials.username, credentials.new_username, err => {
			if (err && err.errno !== 19) { reject(err); return; }
			else { resolve(err ? false : true); return; }
		});
	}.bind(this));
}

SecureLogin.prototype.changePassword = function (credentials) {
	return new Promise(function (resolve, reject) {
		hash(this, null, credentials.new_password, (err, salt, pass_hash) => {
			if (err) { reject(err); return; }
			this.db.updatePassword(credentials.username, pass_hash, salt, this.settings["iteration count"], err => {
				if (err) { reject(err); return; }
				resolve(true);
			});
		});
	}.bind(this));
}

SecureLogin.prototype.removeUser = function (credentials) {
	return new Promise(function (resolve, reject) {
		this.db.deleteUser(credentials.username, err => {
			if (err) { reject(err); return; }
			resolve(true);
		});
	}.bind(this));
}

/*===========
The all-important hash function
============*/
//hashes a message using pbkdf2 algorithm
//callback has three parameters: err:error, salt:string, msg_hash:string
function hash(obj, salt, msg, cb) {
	//generating random salt if necessary
	if (salt == null) {
		crypto.randomBytes(obj.settings["hash length"], (err, salt) => {
			if (err) { cb(err); return; }
			hash(obj, salt.toString("hex"), msg, cb);
		});
		return;
	}

	//type checking
	if (typeof salt == "string") {
		salt = Buffer.from(salt, "hex");
	}

	//actually hashing
	crypto.pbkdf2(msg, salt, obj.settings["iteration count"], obj.settings["hash length"], "sha256", (err, msg_hash) => {
		if (err) { cb(err); return; }
		cb(null, salt.toString("hex"), msg_hash.toString("hex"));
	});
}





/*==========
Module exports
==========*/
module.exports = function() {
	return new SecureLogin();
}
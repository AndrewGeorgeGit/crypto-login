//
const crypto = require("crypto");





//object definition
const cl = new CryptoLogin();
function CryptoLogin() {
	this.db = require("./crypto-login-database")();
	this.settings = {
		"iteration count": 20000,
		"hash length": 64
	}
}

CryptoLogin.prototype.start = function() {
	this.db.start();
	return this;
};

CryptoLogin.prototype.set = function (prop, val) {
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
CryptoLogin.prototype.addUser = function (user, pass, cb) {
	hash(this, null, pass, (err, salt, pass_hash) => {
		if (err) { cb(err); return; }
		this.db.insertUser(user, pass_hash, salt, this.settings["iteration count"], err => {
			cb(err);
		});
	});
}

CryptoLogin.prototype.authenticate = function (user, pass, cb) {
	this.db.selectUser(user, (err, row) => {
		if (err) { cb(err); return; }
		else if (!row) { cb(null, false); return; }
		hash(this, row[this.db["salt column"]], pass, (err, salt, pass_hash) => {
			if (err) { cb(err); return; }
			cb(err, pass_hash == row[this.db["password hash column"]]);
		});
	});
}

CryptoLogin.prototype.changePassword = function (user, old_pass, new_pass, cb) {

}

CryptoLogin.prototype.removeUser = function (user, cb) {
	this.db.deleteUser(user, (err) => {
		cb(err);
	});
}

/*===========
The all-important hash function
============*/
//hashes a message using pbkdf2 algorithm
//callback has three parameters: err:error, salt:string, msg_hash:string
function hash(obj, salt, msg, cb) { //todo: cleaner implementation
	if (salt == null) {
		crypto.randomBytes(obj.settings["hash length"], (err, salt) => {
			if (err) { cb(err); return; }
			crypto.pbkdf2(msg, salt, obj.settings["iteration count"], obj.settings["hash length"], "sha256", (err, msg_hash) => {
				if (err) { cb(err); return; }
				cb(null, salt.toString("hex"), msg_hash.toString("hex"));
			});
		});
	} else {
		crypto.pbkdf2(msg, Buffer.from(salt, "hex"), obj.settings["iteration count"], obj.settings["hash length"], "sha256", (err, msg_hash) => {
			if (err) { cb(err); return; }
			cb(null, salt.toString("hex"), msg_hash.toString("hex"));
		});
	}
}





/*==========
Module exports
==========*/
module.exports = function() {
	return new CryptoLogin();
}
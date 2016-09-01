//
const crypto = require("crypto");





//object definition
function SecureLogin() {
	this.db = require("./secure-login-database")();
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
SecureLogin.prototype.addUser = function (user, pass, cb) {
	hash(this, null, pass, (err, salt, pass_hash) => {
		if (err) { cb(err); return; }
		this.db.insertUser(user, pass_hash, salt, this.settings["iteration count"], cb);
	});
}

SecureLogin.prototype.authenticate = function (user, pass, cb) {
	this.db.selectUser(user, (err, row) => {
		if (err) { cb(err); return; }
		else if (!row) { cb(null, false); return; }
		hash(this, row[this.db["salt column"]], pass, (err, salt, pass_hash) => {
			if (err) { cb(err); return; }
			cb(err, pass_hash == row[this.db["password hash column"]]);
		});
	});
}

SecureLogin.prototype.changeUsername = function (old_user, new_user, cb) {
	this.db.updateUsername(old_user, new_user, cb);
}

SecureLogin.prototype.changePassword = function (user, new_pass, cb) {
	hash(this, null, new_pass, (err, salt, pass_hash) => {
		if (err) { cb(err); return; }
		this.db.updatePassword(user, pass_hash, salt, this.settings["iteration count"], cb);
	});
}

SecureLogin.prototype.removeUser = function (user, cb) {
	this.db.deleteUser(user, cb);
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
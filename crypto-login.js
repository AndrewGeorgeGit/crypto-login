//
const crypto = require("crypto");
const db = require("./crypto-login-database")().start();





//
var settings = {
	salt_length: 64,
	pbkdf2_iterations: 20000,
	hash_length: 64
};





//hashes a message using pbkdf2 algorithm
//callback has three parameters: err:error, salt:string, msg_hash:string
function hash(salt, msg, cb) {
	if (salt == null) {
		crypto.randomBytes(settings.salt_length, (err, salt) => {
			if (err) { cb(err); return; }
			crypto.pbkdf2(msg, salt, settings.pbkdf2_iterations, settings.hash_length, "sha256", (err, msg_hash) => {
				if (err) { cb(err); return; }
				cb(null, salt.toString("hex"), msg_hash.toString("hex"));
			});
		});
	} else {
		crypto.pbkdf2(msg, Buffer.from(salt, "hex"), settings.pbkdf2_iterations, settings.hash_length, "sha256", (err, msg_hash) => {
			if (err) { cb(err); return; }
			cb(null, salt.toString("hex"), msg_hash.toString("hex"));
		});
	}
}

function addUser(user, pass, cb) {
	hash(null, pass, (err, salt, pass_hash) => {
		if (err) { cb(err); return; }
		db.insertUser(user, pass_hash, salt, settings.pbkdf2_iterations, err => {
			cb(err);
		});
	});
}


function authenticate(user, pass, cb) {
	db.selectUser(user, (err, row) => {
		if (err) { cb(err); return; }
		else if (!row) { cb(null, false); return; }
		hash(row["salt"], pass, (err, salt, pass_hash) => {
			if (err) { cb(err); return; }
			cb(err, pass_hash == row["passwordHash"]);
		});
	});
}

function removeUser(user, cb) {
	db.deleteUser(user, (err) => {
		cb(err);
	});
}

exports.addUser = addUser;
exports.authenticate = authenticate;
exports.removeUser = removeUser;
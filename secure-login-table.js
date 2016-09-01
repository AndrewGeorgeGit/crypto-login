//
const sql = require("sqlite3").verbose();





//definition of database 
function SecureLoginTable() {
	this["database instance"] = null;
	this["database path"] = "./crypto_login_files/database.db";
	this["table"] = "users";
	this["username column"] = "username";
	this["password hash column"] = "passwordHash";
	this["salt column"] = "salt";
	this["iterations column"] = "iterations";
};

SecureLoginTable.prototype.start = function() {
	this.db = new sql.Database(this["database path"]);
	this.db.run(`CREATE TABLE IF NOT EXISTS ${this["table"]} (` +
		`${this["username column"]} TEXT PRIMARY KEY, ` +
		`${this["password hash column"]} TEXT, ` +
		`${this["salt column"]} TEXT, ` +
		`${this["iterations column"]} INTEGER` +
		`)`);

	return this;
};





/*==========
User management
==========*/
SecureLoginTable.prototype.insertUser = function (user, pass_hash, salt, iterations, cb) {
	this.db.run(`INSERT INTO ${this["table"]} VALUES( ? ,  ? ,  ? , ? )`, [user, pass_hash, salt, iterations], err => cb(err));
};

SecureLoginTable.prototype.updatePassword = function (user, new_pass_hash, new_salt, new_iterations, cb) {
	this.db.run(`UPDATE ${this["table"]} SET 
		${this["password hash column"]}=?, 
		${this["salt column"]}=?,
		${this["iterations column"]}=? `,
		[new_pass_hash, new_salt, new_iterations],
		cb);
};

SecureLoginTable.prototype.selectUser = function (user, cb) {
	this.db.get(`SELECT * FROM ${this["table"]} WHERE ${this["username column"]}=?`, user, (err, row) => cb(err, row));
};

SecureLoginTable.prototype.deleteUser = function (user, cb) {
	this.db.run(`DELETE FROM ${this["table"]} WHERE ${this["username column"]}=?`, user, err => cb(err));
};





//exports
module.exports = function() {
	return new SecureLoginTable;
};
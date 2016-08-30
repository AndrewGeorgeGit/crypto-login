//
const sql = require("sqlite3").verbose();





//definition of database 
function CryptoLoginDatabase() {
	this.instance = null;
	this.path = "./crypto_login_files/database.db";
	this.table = "users";
	this.column_names = {
		"username": "username",
		"password hash": "passwordHash",
		"salt": "salt",
		"iterations": "iterations"
	}
};

CryptoLoginDatabase.prototype.start = function() {
	this.instance = new sql.Database(String(this.path));
	this.instance.run(`CREATE TABLE IF NOT EXISTS ${this.table} (` +
		`${this.column_names["username"]} TEXT PRIMARY KEY, ` +
		`${this.column_names["password hash"]} TEXT, ` +
		`${this.column_names["salt"]} TEXT, ` +
		`${this.column_names["iterations"]} INTEGER` +
		`)`);

	return this;
};

//todo: stop using static values
CryptoLoginDatabase.prototype.insertUser = function (user, pass_hash, salt, iterations, cb) {
	this.instance.run(`INSERT INTO ${this.table} VALUES( ? ,  ? ,  ? , ? )`, [user, pass_hash, salt, iterations], err => cb(err));
};

CryptoLoginDatabase.prototype.selectUser = function (user, cb) {
	this.instance.get(`SELECT * FROM ${this.table} WHERE ${this.column_names["username"]}=?`, user, (err, row) => cb(err, row));
};

CryptoLoginDatabase.prototype.deleteUser = function (user, cb) {
	this.instance.run(`DELETE FROM ${this.table} WHERE ${this.column_names["username"]}=?`, user, err => cb(err));
};





//
var db = new CryptoLoginDatabase();





//
module.exports = function() {
	return new CryptoLoginDatabase;
};
const sqlite3 = require("sqlite3").verbose();

class SecureLoginDatabase {
	constructor() {
		this.db = null;
		this.path = "./secure_login.db";

		this.usersTable = "users"
		this.tables = {
			[this.usersTable]: {
				username: 'TEXT PRIMARY KEY',
				hash: 'TEXT',
				salt: 'TEXT',
				iterations: 'INTEGER'
			}
		};
	}

	start() { //what to do if this operation fails?
		this.db = new sqlite3.Database(this.path);
		var sql = "";
		for (let table in this.tables) {
			sql = `CREATE TABLE IF NOT EXISTS ${table} (`;
			for (let column in this.tables[table]) {
				sql += `${column} ${this.tables[table][column]},`;
			}
			sql = sql.slice(0, -1) + ");"; //removing extra comma and terminating statement
		}

		return new Promise(function (resolve, reject) {
			this.db.run(sql, err => !err ? resolve(true) : reject(err));
		}.bind(this));
	}

	insertUser(column_values) {
		//parameter validation
		if(Object.keys(this.tables[this.usersTable]).find(k => !(k in column_values))) return new Error("sl.db.insertUser: not all column values supplied");

		return new Promise(function (resolve, reject) {
			this.db.run(`INSERT INTO ${this.usersTable} (username, hash, salt, iterations) VALUES (?, ?, ?, ?)`,
				        [column_values.username, column_values.hash, column_values.salt, column_values.iterations],
				        err => {
							if (!err) resolve(true);
							else if (err.errno === 19) resolve(false); //username already exists
							else reject(err);
						});

		}.bind(this));
	}

	selectUser(column_values) {
		if(!('username' in column_values)) return new Error("sl.db.selectUser: no desired username was provided"); 

		return new Promise(function (resolve, reject) {
			this.db.get(`SELECT * FROM ${this.usersTable} WHERE username=?`, [column_values.username],
			            (err, row) => !err ? resolve(row) : reject(err));
		}.bind(this));	
	}

	deleteUser(column_values) {
		if(!('username' in column_values)) return new Error("sl.db.deleteUser: username to delete was not provided");

		return new Promise(function (resolve, reject) {
			this.db.run(`DELETE FROM ${this.usersTable} WHERE username=?`, [column_values.username], err => !err ? resolve(true) : reject(err));
		}.bind(this));	
	}

	updateUsername(column_values) {
		if(!('username' in column_values)) return new Error("sl.db.updateUsername: no old username was provided");
		if(!('newUsername' in column_values)) return new Error("sl.db.updateUsername: no new username was provided");

		return new Promise(function (resolve, reject) {
			this.db.run(`UPDATE ${this.usersTable} SET username=? WHERE username=?`, [column_values.newUsername, column_values.username],
				        err => !err ? resolve(true) : reject(err));
		}.bind(this));
	}

	updatePassword(column_values) {
		//parameter validation
		if (Object.keys(this.tables[this.usersTable]).find(k => !(k in column_values))) return new Error("sl.db.updatePassword: not all column values supplied");

		return new Promise(function (resolve, reject) {
			this.db.run(`UPDATE ${this.usersTable} SET hash=?, salt=?, iterations=? WHERE username=?`,
				        [column_values.hash, column_values.salt, column_values.iterations, column_values.username],
				        err => !err ? resolve(true) : reject(err))
		}.bind(this));
	}
}

module.exports = new SecureLoginDatabase();
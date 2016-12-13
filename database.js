const sqlite3 = require('sqlite3');
const hash = require('./hash');


class Credentials {
	constructor(raw) {
		this.$oldUsername = raw.$oldUsername;
		this.$username = raw.$username;
		this.$password = raw.$password;
	}

	set(member, value) {
		this[member] = value;
	}

	get(member) {
		return this[member];
	}

	has(member) {
		return (member in this);
	}

	isDatabaseReady() { //true if all rowFormat columns are present
		return this.has("$username") && this.has("$iterations") && this.has("$salt") && this.has("$hash");
	}

	rowFormat() { //returns concise object containing column values
		return {
			$username: this.$username,
			$iterations: this.$iterations,
			$salt: this.$salt,
			$hash: this.$hash
		};
	}
}

class SecureLoginDatabase {
	constructor() {
		//the specific databse instance
		this.db = null;

		//options which can be overriden by the users
		this.settings = {
			dbPath: "./secure_login.db"
		}

		//table schema
		this.tableName = "users";
		this.columns = {
			username: "TEXT PRIMARY KEY",
			hash: "TEXT",
			salt: "TEXT",
			iterations: "INTEGER"
		}
	}

	start(callback) {
		this.db = new sqlite3.Database(this.settings.dbPath); //todo: still puts db in relative path, close

		//creating table if need be
		let sql = `CREATE TABLE IF NOT EXISTS ${this.tableName}`;
		sql += `(`;
		for (let column in this.columns) {
			sql += `${column} ${this.columns[column]},`
		}
		sql = sql.slice(0, -1); //removing extra comma
		sql += `);`;

		//executing statement
		this.db.run(sql, err => callback(err));
	}

	addUser(credentials, callback) {
		//what is defined behavior for faliure to hash?
		(function run(err) {
			if (err) {
				callback(new Error("sl.db.addUser: failed to hash password. This is a most likely a problem with the crypto module."));
				return;
			}

			//not database ready if $password hasn't been hashed
			if (!credentials.isDatabaseReady()) {
				hash(credentials, run);
				return;
			}

			//creating sql, todo: combine with update password
			let sql = `INSERT INTO ${singleton.tableName}`;
			let columns = "", values = "";
			for (let column in singleton.columns) {
				columns += `${column},`
				values += `$${column},` //todo: hard coded dollar sign
			}
			sql += `(${columns.slice(0, -1)}) VALUES (${values.slice(0,-1)})`;

			//executing
			singleton.db.run(sql, credentials.rowFormat(), err => callback(err)); //todo: consider returning username
		})();
	}

	authenticateUser(credentials, callback) {
		this.db.get(`SELECT * FROM ${singleton.tableName} WHERE username=?`, credentials.get("$username"), (err, row) => {

		});
		//find username, hash passed password, compare it to has
	}

	removeUser(credentials) {

	}

	changeUsername(credentials) {

	}

	changePassword(credentials) {

	}
}





const singleton = new SecureLoginDatabase();
exports = module.exports = singleton;
exports.Credentials = Credentials;

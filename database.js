const sqlite3 = require('sqlite3');
const hash = require('./hash');
const slCodes = require('./codes');


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
class DatabaseReceipt {
	constructor(username) {
		this.username = username;
		this.failReason = slCodes.NONE;
	}

	setSuccess(success) {
		this.success = success;
	}

	setFailReason(failReason) {
		this.failReason = failReason;
	}
}

class SecureLoginDatabase {
	constructor() {
		//the specific databse instance
		this.db = null;

		//options which can be overriden by the users
		this.settings = {
			path: "./secure_login.db"
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

	setProperty(property, value) {
		switch(property[0]) {
			case 'path':
				if (typeof value !== "string") throw new TypeError('sl.db.setProperty: desired sl.db."' + property[0] +'" value is not of required type string.');
				this.settings[property[0]] = value;
				break;
			default:
				throw new ReferenceError('sl.db.setProperty: "' + property[0] + '" is not a sl.db property. You cannot set its value.');
				break;
		}
	}

	start(callback) {
		this.db = new sqlite3.Database(this.settings.path); //todo: still puts db in relative path, close

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
			singleton.db.run(sql, credentials.rowFormat(), err => {
				const receipt = new DatabaseReceipt(credentials.get("$username"));
				if (!err) {
					receipt.setSuccess(true);
					callback(null, receipt);
				}
				else if (err.errno === 19) {
					receipt.setSuccess(false);
					receipt.setFailReason(slCodes.USER_EXISTS);
					callback(null, receipt);
				}
				else {
					callback(err);
				}
			}); //todo: consider returning username
		})();
	}

	authenticateUser(credentials, callback) {
		this.db.get(`SELECT * FROM ${singleton.tableName} WHERE username=?`, credentials.get("$username"), (err, row) => {
			const receipt = new DatabaseReceipt(credentials.get("$username"));

			if (err) {
				callback(err);
				return;
			} else if (!row) {
				receipt.setSuccess(false);
				receipt.setFailReason(slCodes.USER_DNE);
				callback(null, receipt); //todo: should receipt return an invalid username?
				return;
			}

			credentials.set("$iterations", row.iterations);
			credentials.set("$salt", row.salt);
			hash(credentials, () => {
				if (credentials.get("$hash") === row.hash) {
					receipt.setSuccess(true);
					callback(null, receipt);
				} else {
					receipt.setSuccess(false);
					receipt.setFailReason(slCodes.PASSWORD_INVALID);
					callback(null, receipt);
				}
			});
		});
	}

	removeUser(credentials, callback) {
		this.db.run(`DELETE FROM ${singleton.tableName} WHERE username=?`, credentials.get("$username"), function(err) {
			const receipt = new DatabaseReceipt(credentials.get("$username"));

			if (err) {
				callback(err);
				return;
			} else if (this.changes === 0) { //no row was deleted
				receipt.setSuccess(false);
				receipt.setFailReason(slCodes.USER_DNE);
			} else {
				receipt.setSuccess(true);
			}
			callback(null, receipt);
		});
	}

	changeUsername(credentials) {

	}

	changePassword(credentials) {

	}
}





const singleton = new SecureLoginDatabase();
exports = module.exports = singleton;
exports.Credentials = Credentials;

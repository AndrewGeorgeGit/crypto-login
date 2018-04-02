const sqlite3 = require("sqlite3");
const hash = require("./hash");
const slCodes = require("./codes");
const DatabaseReceipt = require("./receipt");
const SecureLoginCredentials = require("./credentials");

class SecureLoginDatabase {
  constructor() {
    //the specific databse instance
    this.db = null;

    //options which can be overriden by the users
    this.settings = {
      path: "./secure_login.db"
    };

    //table schema
    this.tableName = "users";
    this.columns = {
      username: "TEXT PRIMARY KEY",
      hash: "TEXT",
      salt: "TEXT",
      iterations: "INTEGER"
    };
  }

  setProperty(property, value) {
    switch(property[0]) {
      case "path":
        if (typeof value !== "string") throw new TypeError("sl.db.setProperty: desired sl.db.\"" + property[0] +"\" value is not of required type string.");
        this.settings[property[0]] = value;
        break;
      case "hash":
        hash.setProperty(property.slice(1), value);
        break;
      default:
        throw new ReferenceError("sl.db.setProperty: \"" + property[0] + "\" is not a sl.db property. You cannot set its value.");
    }
    return this;
  }

  start(callback) {
    //creating table if need be
    let sql = `CREATE TABLE IF NOT EXISTS ${this.tableName}`;
    sql += "(";
    for (let column in this.columns) {
      sql += `${column} ${this.columns[column]},`;
    }
    sql = sql.slice(0, -1); //removing extra comma
    sql += ");";

    this.db = new sqlite3.Database(this.settings.path, err => {
      if (err) callback(err);
      else this.db.run(sql, callback);
    });
  }

  addUser(credentials, callback) {
    //$username and $password are required
    if (!credentials.has("$username") || !credentials.has("$password")) {
      const receipt = new DatabaseReceipt(credentials.get("$username"));
      receipt.setSuccess(false);
      receipt.setFailReason(!credentials.has("$username") ? slCodes.USERNAME_REQUIRED : slCodes.PASSWORD_REQUIRED);
      callback(null, receipt);
      return;
    }

    //what is defined behavior for faliure to hash?
    (function run(err) {
      if (err) {
        callback(new Error("sl.db.addUser: failed to hash password. This is a most likely a problem with the crypto module."));
        return;
      }

      if (!credentials.isDatabaseReady()) {
        hash(credentials, run);
        return;
      }

      //creating sql
      let sql = `INSERT INTO ${singleton.tableName}`;
      let columns = "", values = "";
      for (let column in singleton.columns) {
        columns += `${column},`;
        values += `$${column},`;
      }
      sql += `(${columns.slice(0, -1)}) VALUES (${values.slice(0,-1)})`;

      //executing
      singleton.db.run(sql, credentials.rowFormat(), err => {
        if (!callback) return;
        const receipt = new DatabaseReceipt(credentials.get("$username"));
        if (!err) {
          receipt.setSuccess(true);
        }
        else if (err.errno === sqlite3.CONSTRAINT) {
          receipt.setSuccess(false);
          receipt.setFailReason(slCodes.USER_EXISTS);
        }
        else {
          callback(err);
          return;
        }
        callback(null, receipt);
      });
    })();
  }

  authenticateUser(credentials, callback) {
    //username and password are required to authenticateUser
    if (!credentials.has("$username") || !credentials.has("$password")) {
      const receipt = new DatabaseReceipt(credentials.get("$username"));
      receipt.setSuccess(false);
      receipt.setFailReason(!credentials.has("$username") ? slCodes.USERNAME_REQUIRED : slCodes.PASSWORD_REQUIRED);
      callback(null, receipt);
      return;
    }

    this.db.get(`SELECT * FROM ${singleton.tableName} WHERE username=?`, credentials.get("$username"), (err, row) => {
      const receipt = new DatabaseReceipt(credentials.get("$username"));

      if (err) {
        callback(err);
        return;
      } else if (!row) {
        receipt.setSuccess(false);
        receipt.setFailReason(slCodes.USER_DNE);
        callback(null, receipt);
        return;
      }

      credentials.set("$iterations", row.iterations);
      credentials.set("$salt", row.salt);
      hash(credentials, () => {
        if (!callback) return;
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
    if (!credentials.has("$username")) {
      const receipt = new DatabaseReceipt(credentials.get("$username"));
      receipt.setSuccess(false);
      receipt.setFailReason(slCodes.USERNAME_REQUIRED);
      callback(null, receipt);
      return;
    }
    this.db.run(`DELETE FROM ${singleton.tableName} WHERE username=?`, credentials.get("$username"), function(err) {
      if (!callback) return;
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

  changeUsername(credentials, callback) {
    if(!credentials.has("$username") || !credentials.has("$newUsername")) {
      const receipt = new DatabaseReceipt(credentials.get("$username"));
      receipt.setSuccess(false);
      receipt.setFailReason(!credentials.has("$username") ? slCodes.USERNAME_REQUIRED : slCodes.NEW_USERNAME_REQUIRED);
      callback(null, receipt);
      return;
    }

    this.db.run(`UPDATE ${this.tableName} SET username=? WHERE username=?`, [credentials.get("$newUsername"), credentials.get("$username")], function(err) {
      if (!callback) return;

      let receipt;
      if (err) {
        if (err.errno === sqlite3.CONSTRAINT) {
          receipt = new DatabaseReceipt(credentials.get("$username"));
          receipt.setSuccess(false);
          receipt.setFailReason(slCodes.USER_EXISTS);
          callback(null, receipt);
          return;
        } else {
          callback(err);
          return;
        }
      }

      if (this.changes === 0) {
        receipt = new DatabaseReceipt(credentials.get("$username"));
        receipt.setSuccess(false);
        receipt.setFailReason(slCodes.USER_DNE);
      } else {
        receipt = new DatabaseReceipt(credentials.get("$newUsername"));
        receipt.setSuccess(true);
      }
      callback(null, receipt);
    });
  }

  changePassword(credentials, callback) {
    if(!credentials.has("$username") || !credentials.has("$newPassword")) {
      const receipt = new DatabaseReceipt(credentials.get("$username"));
      receipt.setSuccess(false);
      receipt.setFailReason(!credentials.has("$username") ? slCodes.USERNAME_REQUIRED : slCodes.NEW_PASSWORD_REQUIRED);
      callback(null, receipt);
      return;
    }

    credentials.set("$password", credentials.get("$newPassword")); //need to swap to work with hashing algorithm

    (function run(err) {
      if (err) {
        callback(new Error("sl.db.addUser: failed to hash password. This is a most likely a problem with the crypto module."));
        return;
      }

      if(!credentials.isDatabaseReady()) {
        hash(credentials, run);
        return;
      }

      const sql = `UPDATE ${singleton.tableName}\
				SET iterations=$iterations, salt=$salt, hash=$hash\
				WHERE username=$username`;
      singleton.db.run(sql, credentials.rowFormat(), function(err) {
        if (!callback) return;
        if (err) { callback(err); return; }
        const receipt = new DatabaseReceipt(credentials.get("$username"));
        if (this.changes === 0) {
          receipt.setSuccess(false);
          receipt.setFailReason(slCodes.USER_DNE);
        } else {
          receipt.setSuccess(true);
        }
        callback(null, receipt);
      });
    })();
  }

  changeUsernameAuth(credentials, callback) {
    const credentialsCopy = SecureLoginCredentials.copy(credentials);
    this.authenticateUser(credentials, (err, receipt) => {
      if (err) { callback(err); return; }
      else if (!receipt.success) { callback(err, receipt); return; }
      this.changeUsername(credentialsCopy, callback);
    });
  }

  changePasswordAuth(credentials, callback) {
    const credentialsCopy = SecureLoginCredentials.copy(credentials);
    this.authenticateUser(credentials, (err, receipt) => {
      if (err) { callback(err); return; }
      else if (!receipt.success) { callback(err, receipt); return; }
      this.changePassword(credentialsCopy, callback);
    });
  }

  removeUserAuth(credentials, callback) {
    const credentialsCopy = SecureLoginCredentials.copy(credentials);
    this.authenticateUser(credentials, (err, receipt) => {
      if (err) { callback(err); return; }
      else if (!receipt.success) { callback(err, receipt); return; }
      this.removeUser(credentialsCopy, callback);
    });
  }
}





const singleton = new SecureLoginDatabase();
exports = module.exports = singleton;

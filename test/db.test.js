const mocha = require("mocha");
const sinon = require("sinon");
const assert = require("assert");
const hash = require("../hash");
const db = require("../database");
const SecureLoginCredentials = require("../credentials");
const slCodes = require("../codes");



describe('Database', function() {
   before(function(done) { //use in memory database
      db.setProperty(["path"], ":memory:");
      db.start(done);
   });





   //add 'username'/'password'
   describe('#addUser', function() {
      const creds = new SecureLoginCredentials({$username: "username", $password: "password"});
      describe('case: user does not already exist', function() {
         let err, receipt;
         before(function(done) {
            db.addUser(creds, (e, r) => {
               err = e;
               receipt = r;
               done();
            });
         });

         it('no sqlite error thrown', () => { if (err) throw err; });
         it('receipt contains passed username', () => assert(receipt.username === creds.get("$username")));
         it('receipt indicates success', () => assert(receipt.success));
         it("receipt's failReason indicates 'NONE'", () => assert(receipt.failReason === slCodes.NONE));
         it('user appears in database correctly', done => {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => { //confirming user was added to database correctly
               assert(creds.get("$username") === row.username);
               assert(creds.get("$iterations") === row.iterations);
               assert(creds.get("$salt") === row.salt);
               assert(creds.get("$hash") === row.hash);
               done(err);
            });
         });
      });

      describe("case: user already exists", function() {
         let err, receipt;
         before(function(done) {
            db.addUser(creds, (e, r) => {
               err = e;
               receipt = r;
               done();
            });
         });

         it('no sqlite error thrown', () => { if (err) throw err; });
         it('receipt contains passed username', () => assert(receipt.username === creds.get("$username")));
         it('receipt indicates failure', () => assert(!receipt.success));
         it("receipt's failReason indicates 'USER_EXISTS'", () => assert(receipt.failReason === slCodes.USER_EXISTS));
      });

      describe("case: required credentials missing", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new SecureLoginCredentials();
         db.addUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("(missing username) receipt's failReason is set to USERNAME_REQUIRED", () => assert(receipt.failReason === slCodes.USERNAME_REQUIRED));
         it("(missing password) receipt's failReason is set to PASSWORD_REQUIRED", () => {
            creds.set("$username", "username");
            db.addUser(creds, callback);
            assert(receipt.failReason === slCodes.PASSWORD_REQUIRED)
         });
      });
   });





   //check for 'username'/'password'
   describe("#authenticateUser", function() {
      const creds = new SecureLoginCredentials({$username: "invalid_username", $password: "invalid_password"});
      describe("case: invalid username", function() {
         let err, receipt;
         before(function(done) {
            db.authenticateUser(creds, (e, r) => {
               err = e;
               receipt = r;
               done();
            });
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates failure', () => assert(!receipt.success));
         it('receipt indicates failure caused by invalid username', () => assert(receipt.failReason === slCodes.USER_DNE));
      });

      describe("case: valid username, invalid password", function() {
         let err, receipt;
         before(function(done) {
            creds.set("$username", "username");
            db.authenticateUser(creds, (e, r) => {
               err = e;
               receipt = r;
               done();
            });
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates failure', () => assert(!receipt.success));
         it('receipt indicates failure caused by invalid password', () => assert(receipt.failReason === slCodes.PASSWORD_INVALID));
      });

      describe("case: valid username and password", function() {
         let err, receipt;
         before(function(done) {
            creds.set("$password", "password");
            db.authenticateUser(creds, (e, r) => {
               err = e;
               receipt = r;
               done();
            });
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates success', () => assert(receipt.success));
         it('receipt failure reason is NONE', () => assert(receipt.failReason === slCodes.NONE));
      });

      describe("case: required credentials missing", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new SecureLoginCredentials();
         db.authenticateUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("(missing username) receipt's failReason is set to USERNAME_REQUIRED", () => assert(receipt.failReason === slCodes.USERNAME_REQUIRED));
         it("(missing password) receipt's failReason is set to PASSWORD_REQUIRED", () => {
            creds.set("$username", "username");
            db.authenticateUser(creds, callback);
            assert(receipt.failReason === slCodes.PASSWORD_REQUIRED);
         });
      });
   });





   describe("#changePassword", function() {
      describe("case: valid username", function() {
         const creds = new SecureLoginCredentials({$username: "username", $newPassword: "newpassword"});
         let err, receipt;
         before(function(done) {
            db.changePassword(creds, (e,r) => { err = e; receipt = r; done(); });
         });
         it("no sqlite error thrown", () => assert.ifError(err));
         it("receipt contains username", () => assert(receipt.username === creds.get("$username")));
         it("receipt indicates success", () => assert(receipt.success));
         it("receipt's failReason is set to NONE", () => assert(receipt.failReason === slCodes.NONE));
         it("database contains updated password hash", done => {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => {
               assert(row, "row found");
               assert(row.iterations === creds.get("$iterations"), "iterations equality");
               assert(row.salt === creds.get("$salt"), "salt equality");
               assert(row.hash === creds.get("$hash"), "hash equality");
               done();
            });
         });
      });

      describe("case: invalid username", function() {
         const creds = new SecureLoginCredentials({$username: "invalid_username", $newPassword: "newpassword"});
         let err, receipt;
         before(function(done) {
            db.changePassword(creds, (e,r) => { err = e; receipt = r; done(); });
         });

         it("no sqlite error thrown", () => assert.ifError(err));
         it("receipt contains username", () => assert(receipt.username === creds.get("$username")));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("receipt failReason is set to USER_DNE", () => assert(receipt.failReason === slCodes.USER_DNE));
      });

      describe("case: required credentials missing", function() {
         const creds = new SecureLoginCredentials();
         let receipt;
         function callback(e, r) { receipt = r; }

         db.changePassword(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.get("$username")));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("(missing username) receipt's failReason is set to USERNAME_REQUIRED", () => assert(receipt.failReason === slCodes.USERNAME_REQUIRED));
         it("(missing newPassword) receipt's failReason is set to NEW_PASSWORD_REQUIRED", () => {
            creds.set("$username", "username");
            db.changePassword(creds, callback);
            assert(receipt.failReason === slCodes.NEW_PASSWORD_REQUIRED);
         });
      });
   });





   describe("#changeUsername", function() {
      let err, receipt;
      describe("case: new user does not exist", function() {
         const creds = new SecureLoginCredentials({$username: 'username', $newUsername: 'andrew'})
         before(function(done) {
            db.changeUsername(creds, (e,r) => { err = e; receipt = r; done(); });
         });

         it("no sqlite error thrown", function() { if(err) throw err; });
         it("receipt contains new username", function(){ assert(receipt.username === creds.get("$newUsername")); });
         it("receipt indicates success", function(){ assert(receipt.success); });
         it("receipt failReason is set to NONE", function(){ assert(receipt.failReason === slCodes.NONE); });
         it("new user appears in database", function(done) {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$newUsername"), (err, row) => {
               assert(row.username === creds.get("$newUsername"));
               done(err);
            });
         });
         it("old user does not appear in database", function(done) {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => {
               assert(!row);
               done(err);
            });
         });
      });

      describe("case: new user exists", function() {
         const creds = new SecureLoginCredentials({$username: 'andrew', $newUsername: 'george'})

         before(function(done) { //adding dummy user
            db.db.run(`INSERT INTO ${db.tableName}(username) VALUES('george')`, [], err => done(err));
         });

         let err, receipt;
         before(function(done) { //actual test begins
            db.changeUsername(creds, (e, r) => { err = e; receipt = r; done(); });
         });

         it("no sqlite error thrown", function(){ if(err) throw err; });
         it("receipt contains old username", function() { assert.deepEqual(receipt.username, creds.get("$username")) });
         it("receipt indicates failure", function(){ assert(!receipt.success) });
         it("receipt failReason is set to USER_EXISTS", function(){ assert(receipt.failReason === slCodes.USER_EXISTS) });
         it("old user still appears in database", function(done) {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => {
               assert(row.username === creds.get("$username"));
               done(err);
            });
         });
      });

      describe("case: old user does not exist", function() {
         const creds = new SecureLoginCredentials({$username: "username", $newUsername: "andy"});
         let err, receipt;
         before(function(done) {
            db.changeUsername(creds, (e,r) => { err = e; receipt = r; done(); });
         });
         it("no sqlite error thrown", function(){ assert.ifError(err); });
         it("receipt contains old username", function(){ assert.deepEqual(receipt.username, creds.get("$username")) });
         it("receipt indicates failure", function(){ assert(!receipt.success) });
         it("receipt failReason is set to USER_DNE", function(){ assert.deepEqual(receipt.failReason, slCodes.USER_DNE) });
      });

      describe("case: required credentials missing", function() {
         const creds = new SecureLoginCredentials();
         let receipt;
         function callback(e, r) { receipt = r; }
         db.changeUsername(creds, callback);
         it("receipt contains old username", function(){ assert.deepEqual(receipt.username, creds.get("$username")) });
         it("receipt indicates failure", function(){ assert(!receipt.success) });
         it("(missing username) receipt's fail reason indicates USERNAME_REQUIRED", function(){ assert.deepEqual(receipt.failReason, slCodes.USERNAME_REQUIRED) });
         it("(missing newUsername) receipt's failure reason indicates NEW_USERNAME_REQUIRED", function() {
            creds.set("$username", 'andrew');
            db.changeUsername(creds, callback);
            assert.deepEqual(receipt.failReason, slCodes.NEW_USERNAME_REQUIRED);
         });
      });
   });





   describe("#removeUser", function() {
      const creds = new SecureLoginCredentials({$username: "andrew"});
      describe("case: user exists", function() {
         let err, receipt;
         before(function(done) {
            db.removeUser(creds, (e, r) => { err = e; receipt = r; done(); })
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates success', () => assert(receipt.success));
         it('receipt failure reason is NONE', () => assert(receipt.failReason === slCodes.NONE));
         it("user does not exist in database", done => {
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => {
               assert(!row);
               done();
            });
         });
      });

      describe("case: user does not exist", function() {
         let err, receipt;
         before(function(done) {
            db.removeUser(creds, (e, r) => { err = e; receipt = r; done(); })
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates failure', () => assert(!receipt.success));
         it('receipt failure is caused by user not existing', () => assert(receipt.failReason === slCodes.USER_DNE));
      });

      describe("case: required credentials missing", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new SecureLoginCredentials();
         db.removeUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("(missing username) receipt's failReason is set to USERNAME_REQUIRED", () => assert(receipt.failReason === slCodes.USERNAME_REQUIRED));
      });
   });

   describe("#changeUsernameAuth", function() {

   });

   describe("#changePasswordAuth", function() {
      describe("case: invalid username", function() {

      });

      describe("case: valid username, invalid password", function() {

      });

      describe("case: valid username, valid password", function() {

      });

      describe("case: required credentials missing", function() {

      });
   });

   describe("#removeUserAuth", function() {

   });

   describe("#setProperty", function() {
      const defaultPath = db.settings.path;

      //expected behavior
      it("hash: successfully forwards", () => {
         db.setProperty(["hash", "iterations"], 10);
      });
      it("path: changes value", () => {
         db.setProperty(["path"], "new_path");
         assert(db.settings.path !== defaultPath);
      });

      //what could go wrong
      it("path: throws when passed non-string value", () => {
         try { db.setProperty(["path"], 123); }
         catch(err) { return; }
         throw Error();
      });
      it("throws if property does not exist", () => {
         try { db.setProperty(["nonproperty"], "hello_world"); }
         catch(err) { return; }
         throw Error();
      });
   });
});

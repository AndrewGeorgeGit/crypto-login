const mocha = require('mocha');
const sinon = require('sinon');
const assert = require('assert');
const hash = require('../hash');
const db = require('../database');
const slCodes = require('../codes');



describe('Database', function() {
   before(function(done) {
      db.setProperty(["path"], ":memory:");
      db.start(done);
   });





   //add 'username'/'password'
   describe('#addUser', function() {
      const creds = new db.Credentials({$username: "username", $password: "password"});
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

      describe("case: illegal credentials provided", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new db.Credentials();
         db.addUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("receipt's failReason indicates credentials are invalid", () => assert(receipt.failReason === slCodes.ILLEGAL_CREDENTIALS));
      });
   });





   //check for 'username'/'password'
   describe("#authenticateUser", function() {
      const creds = new db.Credentials({$username: "invalid_username", $password: "invalid_password"});
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

      describe("case: illegal credentials provided", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new db.Credentials();
         db.authenticateUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("receipt's failReason indicates credentials are invalid", () => assert(receipt.failReason === slCodes.ILLEGAL_CREDENTIALS));
      });
   });


   describe("#removeUser", function() {
      const creds = new db.Credentials({$username: "username"});
      describe("case: user exists", function() {
         let err, receipt;
         before(function(done) {
            db.removeUser(creds, (e, r) => { err = e; receipt = r; done(); })
         });
         it('no sqlite error', () => { if(err) throw err; });
         it('receipt contains passed username', () => assert(creds.get("$username") === receipt.username));
         it('receipt indicates success', () => assert(receipt.success));
         it('receipt failure reason is NONE', () => assert(receipt.failReason === slCodes.NONE));
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

      describe("case: illegral credentials provided", function() {
         let receipt;
         function callback(e, r) { receipt = r; }
         const creds = new db.Credentials();
         db.removeUser(creds, callback);
         it("receipt contains passed username", () => assert(receipt.username === creds.username));
         it("receipt indicates failure", () => assert(!receipt.success));
         it("receipt's failReason indicates credentials are invalid", () => assert(receipt.failReason === slCodes.ILLEGAL_CREDENTIALS));
      });
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

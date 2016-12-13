const db = require('../database');
const mocha = require('mocha');
const sinon = require('sinon');
const hash = require('../hash');
const assert = require('assert');



describe('Database', function() {
   before(function(done) {
      db.start(done);
   });

   describe('#addUser', function() {
      const creds = new db.Credentials({$username: "username", $password: "password"});
      it('should hash credentials object before placing it in database', done => {
         db.addUser(creds, err => { //adding user
            db.db.get(`SELECT * FROM ${db.tableName} WHERE username=?`, creds.get("$username"), (err, row) => { //confirming user was added to database correctly
               assert(creds.get("$username") === row.username);
               assert(creds.get("$iterations") === row.iterations);
               assert(creds.get("$salt") === row.salt);
               assert(creds.get("$hash") === row.hash);
               done();
            });
         });
      });

      it('should alert that username already exists', done => {
         db.addUser(creds, err => done(assert(err)));
      });
   });
})
//describe('Add User to Database');
describe('Secure Login Database', function() {
   // this.timeout(9999);
   // beforeEach(function() { sinon.sandbox.create(); });
   // afterEach(function() { sinon.sandbox.restore(); });
   //
   // db.start();
   // describe("#hash", function() {
   //
   //    const creds = new db.Credentials({$username: "username", $password: "password"});
   //    hash(creds, () => {console.log(creds)});
   //
   //
   //    it('should add $hash member to Credentials object', done => {assert(creds.has("$hash"))});
   //    it('$hash should have settings-specified length', () => assert(creds.get("$hash").length === hash.settings.hashLength));
   //    it('should add $salt member to Credentials object', () => assert(creds.has("$salt")));
   //    it('$salt should have settings-specified length', () => assert(creds.get("$salt").length === hash.settings.hashLength));
   //    it('should add $iterations member to Credentials object', () => assert(creds.has("$iterations")));
   //    it('$iterations should have settings-specified value', () => assert(creds.get("$iterations") === hash.settings.iterations));
   // });
   // describe("#start", function() {});
   //
   // describe("#addUser", function() {
   //    it('should take Credentials object, hash its password, and store the new user in databse', function(done) {
   //       const creds = new db.Credentials({$username: "username", $password: "password"});
   //
   //    });
   //
   //    it('should experience an error trying to add an already existing username', function(done) {
   //
   //    });
   //
   //    //it('')
   // });
   // db.start();
   // it('#hash', function(done) {
   //    const creds = new db.Credentials({$username: "username", $password: "password"});
   //
   // });
   //
   // it('#addUser', function(done) {
   //    const creds = new db.Credentials({$username: "username", $password: "password"});
   //    sinon.sandbox.stub(hash, "", function(credentials, callback) {
   //       credentials.addHashObj({$hash: "hash", $salt: "salt", $iterations: 100});
   //       callback();
   //    });
   //
   //    db.addUser(creds, done);
   // });
});

const mocha = require('mocha');
const assert = require('assert');
const hash = require('../hash');
const db = require('../database'); //for Credentials object

describe('pbkdf2 hashing', function() {
   const creds = new db.Credentials({$username: "username", $password: "password"});
   before(function(done) {
      hash(creds, () => done());
   });

   it('$hash is member of Credentials object', () => assert(creds.has("$hash")));
   it('$hash is of settings-specified length', () => assert(creds.get("$hash").length / 2 === hash.settings.hashLength)); //hashLength is number of bytes. 2:1 byte ratio between hex string and byte
   it('$salt is member of Credentials object', () => assert(creds.has("$salt")));
   it('$salt is of settings-specified length', () => assert(creds.get("$salt").length / 2 === hash.settings.hashLength)); //hashLength is number of bytes. 2:1 byte ratio between hex string and byte
   it('$iterations is member of Credentials object', () => assert(creds.has("$iterations")));
   it('$iterations is equal to settings-sepcified value', () => assert(creds.get("$iterations") === hash.settings.iterations));
});

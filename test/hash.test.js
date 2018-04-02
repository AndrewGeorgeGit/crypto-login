const mocha = require("mocha");
const assert = require("assert");
const hash = require("../hash");
const SecureLoginCredentials = require("../credentials"); //for Credentials object

describe("hash.js", function() {
  describe("pbkdf2 hashing", function() {
    const creds = new SecureLoginCredentials({$username: "username", $password: "password"});
    before(function(done) {
      hash(creds, () => done());
    });

    it("$hash is member of Credentials object", () => assert(creds.has("$hash")));
    it("$hash is of settings-specified length", () => assert(creds.get("$hash").length / 2 === hash.settings.length)); //hashLength is number of bytes. 2:1 byte ratio between hex string and byte
    it("$salt is member of Credentials object", () => assert(creds.has("$salt")));
    it("$salt is of settings-specified length", () => assert(creds.get("$salt").length / 2 === hash.settings.length)); //hashLength is number of bytes. 2:1 byte ratio between hex string and byte
    it("$iterations is member of Credentials object", () => assert(creds.has("$iterations")));
    it("$iterations is equal to settings-sepcified value", () => assert(creds.get("$iterations") === hash.settings.iterations));
  });

  describe("#setProperty", function() {
    const defaultIterations = hash.settings.iterations, defaultLength = hash.settings.length;

    //expected behavior
    const iter = ["iterations"], len = ["length"];
    it("iterations: changes value", () => {
      hash.setProperty(iter, defaultIterations + 1);
      assert(hash.settings.iterations !== defaultIterations);
    });
    it("length: changes value", () => {
      hash.setProperty(len, defaultLength + 1);
      assert(hash.settings.length !== defaultLength);
    });

    //what can go wrong
    it("iterations: throws when passed non-numeric value", () => {
      try { hash.setProperty(iter, 1.23); }
      catch(err) { return; }
      throw Error();
    });
    it("iterations: throws when passed non-integer value", () => {
      try { hash.setProperty(iter, 1.23); }
      catch(err) { return; }
      throw Error();
    });
    it("iterations: throws when passed value below 1", () => {
      try { hash.setProperty(iter, 0); }
      catch(err) { return; }
      throw Error();
    });
    it("length: throws when passed non-numeric value", () => {
      try { hash.setProperty(len, "abc"); }
      catch(err) { return; }
      throw Error();
    });
    it("length: throws when passed non-integer value", () => {
      try { hash.setProperty(len, 1.23); }
      catch(err) { return; }
      throw Error();
    });
    it("length: throws when passed value below 1", () => {
      try { hash.setProperty(len, 0); }
      catch(err) { return; }
      throw Error();
    });
    it("throws if property does not exist", () => {
      try { hash.setProperty(["nonproperty"], 2); }
      catch(err) { return; }
      throw Error();
    });
  });
});

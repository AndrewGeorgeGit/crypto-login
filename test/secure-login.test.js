const mocha = require("mocha");
const assert = require("assert");
const sinon = require("sinon");
const db = require("../database.js");
const SecureLogin = require("../secure-login.js").SecureLogin;

describe("Secure Login", function() {
   let sl;
   beforeEach(function() {
      sl = new SecureLogin();
   });

   describe("#set", function() {
      it("throws if called after sl has started", function() {
         sl.stage = "not_off";
         assert.throws(() => sl.set("hello", "world"));
      });

      it("throws if provided property is not a string", function() {
         assert.throws(() => sl.set(22, "world"));
      });
      it("throws if provided property does not exist", function() {
         assert.throws(() => sl.set("does_not_exist", "world"));
      });
   });

   describe("#start", function() {
      let dbStartStub = sinon.stub(db, "start", cb => setTimeout(cb, 1000));

      beforeEach(function() {
         dbStartStub.reset();
      });

      it("does nothing if sl already started", function() {
         sl.stage = "not_off";
         sl.start();
         assert(dbStartStub.callCount === 0);
      });

      it("changes to 'starting' stage as db starts", function() {
         sl.start();
         assert(sl.stage === "starting");
      });

      it("changes to 'on' state after database has finished starting", function(done) {
         sl.start();
         setTimeout(() => done(sl.stage === "on" ? null : new Error()), 1001);
      });

      it("queues database to start", function() {
         sl.start();
         assert(dbStartStub.calledOnce);
         it("hello world");
      });
   });

   describe("#run", function() {
      let sessionManagerSpy, apiRouterSpy;
      before(function() {

      });

      beforeEach(function() {
         sessionManagerSpy = sinon.spy(sl.sessionManager, "run");
         apiRouterSpy = sinon.spy(sl.api, "router");
      });

      it("passes error if sl not on", function(done) {
         sl.run(null, null, err => done(err ? null : new Error()));
      });

      it("first: calls sessionManager", function(done) {
         const http = require("http");
         const req = new http.IncomingMessage(), res = new http.ServerResponse(req);
         sl.stage = "on";
         sl.run(req, res, () => done(sessionManagerSpy.called ? null: new Error()));
      });
      it("second: calls API", function(done) {
         const http = require("http");
         const req = new http.IncomingMessage(), res = new http.ServerResponse(req);
         sl.stage = "on";
         sl.run(req, res, () => done(apiRouterSpy.calledAfter(sessionManagerSpy) ? null: new Error()));
      });
   });
});

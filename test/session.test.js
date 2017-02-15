const mocha = require("mocha");
const sinon = require("sinon");
const assert = require("assert");
const http = require("http");
const SessionManager = require("../session");

describe("Sessions", function() {
   let req, res, session, sessionManager;
   beforeEach(function() {
      req = new http.IncomingMessage();
      res = new http.ServerResponse(req);
      sessionManager = new SessionManager();
      session = new SessionManager.Session("wxyz", 1000 * 60 * 10, 1000 * 60 * 10);
      sessionManager.sessions["wxyz"] = session;
   });

   describe("#setProperty", function() {}); //todo

   describe("Sessions or Anonymous Sessions Disabled", function() { //todo: can this really be tested
      it("sessions disabled: no session present", function() {
         sessionManager.settings.use = false;
         sessionManager.run(req, res, function() {
            assert(!req.session);
         });
      });

      it("anon disabled: no session present", function() {
         sessionManager.settings.anon = false;
         sessionManager.run(req, res, function() {
            assert(!req.session);
         });
      });
   });

   describe("No Session", function() {
      beforeEach(function(done) {
         sessionManager.run(req, res, done);
      });

      it("session is attached", function() {
         assert(req.session);
      });

      it("session cookie is present", function() {
         assert(res.getHeader('Set-Cookie').indexOf(sessionManager.anonCookie) !== -1);
      });
   });

   describe("Valid Session", function() {
      beforeEach(function(done) {
         req.headers.cookie = sessionManager.anonCookie + "=wxyz";
         sessionManager.run(req, res, done);
      });

      it("attaches session", function() {
         assert(req.session === session);
      });
   });

   describe("Invalid Session", function() {
      beforeEach(function(done) {
         sessionManager.sessions["wxyz"] = session = new SessionManager.Session("wxyz", 1000, 1000);
         session.authenticated = true;
         req.headers.cookie = sessionManager.anonCookie + "=wxyz";
         setTimeout(function() { sessionManager.run(req, res, done); }, 1001);
      });

      it("old session state is not valid", function() {
         assert(session.ping() !== "valid");
      });

      it("session was deleted from pool", function() {
         assert(!sessionManager.sessions["wxyz"]);
      });

      it("new anonymous session is attached", function() {
         assert(req.session !== session && req.session.authenticated === false);
      });
   });
});

function sessionIsValid(session) {
   return session && session.ping() === "valid";
}

const mocha = require("mocha");
const sinon = require("sinon");
const assert = require("assert");
const http = require("http");
const SessionManager = require("../session");
const slCodes = require("../codes.js")

describe("Sessions", function() {
   let req, res, session, sessionManager;
   beforeEach(function() {
      req = new http.IncomingMessage();
      res = new http.ServerResponse(req);
      sessionManager = new SessionManager.SecureLoginSessionManager();
      session = new SessionManager.Session("wxyz", 1000 * 60 * 10, 1000 * 60 * 10);
      sessionManager.sessions["wxyz"] = session;
      sessionManager.settings.timeouts = {
         anon: {idle: 1000, max: 2000},
         auth: {idle: 3000, max: 4000}
      };
   });

   describe("#setProperty", function() {
      it("returns self", function() {
         assert(sessionManager.setProperty(["use"], true) === sessionManager);
      });

      it("throws if no boolean value is provided to a boolean poperty", function() {
         assert.throws(() => sessionManager.setProperty(["use"], null));
      });

      it("throws if no number value is provided to a number property", function() {
         assert.throws(() => sessionManager.setProperty(["timeouts", "anon", "max"], null));
      });

      it("throws if invalid timeout property provided", function() {
         assert.throws(() => sessionManager.setProperty(["timeouts", "anon", null], -1));
         assert.throws(() => sessionmanager.setProperty(["timeouts", null, "idle"], -1));
      });

      it("updates the correct timeout property", function() {
         const oldAnonMax = sessionManager.settings.timeouts.anon.max;
         sessionManager.setProperty(["timeouts", "anon", "max"], 20);
         assert(oldAnonMax !== sessionManager.settings.timeouts.anon.max);
      });

      it("throws if invalid property is provided", function() {
         assert.throws(() => sessionManager.setProperty(["invalid"], true));
      });
   });

   describe("Sessions or Anonymous Sessions Disabled", function() {
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

   describe("Unable to Generate session ids", function() {
      before(function() {
         sinon.stub(require("crypto"), "randomBytes").yields(new Error("test error"));
      });

      after(function() {
         require("crypto").randomBytes.restore();
      });

      const nextSpy = sinon.spy();
      beforeEach(function(done) {
         nextSpy.reset();
         sessionManager.run(req, res, err => {
            nextSpy(err);
            done();
         });
      });

      it("error is passed", function() {
         assert(nextSpy.args[0][0]);
      });

      it("error contains original error thrown", function() {
         assert(nextSpy.args[0][0].err);
      });

      it("error contains slCode indicating failure to make session id", function() {
         assert(nextSpy.args[0][0].slCode === slCodes.SESSION_ID_ERROR);
      });
   });

   describe("No Session", function() {
      beforeEach(function(done) {
         sessionManager.run(req, res, done);
      });

      it("anonymus session is attached", function() {
         assert(req.session, "session attached");
         assert(!req.session.authenticated, "session is anonymous");
      });

      it("session cookie is present", function() {
         assert(res.getHeader('Set-Cookie').indexOf(sessionManager.anonCookie + "=" + req.session.id) !== -1);
      });

      it("session has correct anon timeouts", function() {
         assert(req.session.times.idles === sessionManager.settings.timeouts.anon.idle, "idle timeout");
         assert(req.session.times.expires.valueOf() - req.session.times.created.valueOf() === sessionManager.settings.timeouts.anon.max, "max timeout");
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

   describe("Authenticating Sessions", function() {
      beforeEach(function(done) {
         req.session = session;
         sessionManager.authenticate(req, res, done);
      });
      it("attaches authenticated session", function() {
         assert(req.session, "session is attached");
         assert(req.session.authenticated, "session is authenticated");
      });

      it("has correct auth idle/expire times", function() {
         const expectedMax = req.session.times.expires.valueOf() - req.session.times.created.valueOf();
         assert(sessionManager.settings.timeouts.auth.idle === req.session.times.idles, "idle timeout");
         assert(expectedMax === sessionManager.settings.timeouts.auth.max, "max timeout");
      });

      it("handles failure to generate session id");

      it("Session manager has reference to new session", function() {
         assert(sessionManager.sessions[req.session.id]);
      });

      it("cookie has been set correct", function() {
         assert(res.getHeader('Set-Cookie').indexOf(sessionManager.authCookie + "=" + req.session.id) !== -1);
      });

      it("anon and auth session are correctly linked", function() {
         assert(req.session.data === session.data, "they share the same data");
         assert(req.session.lastPinged === session.lastPinged, "they both share the last ping information")
      });
   });
});

function sessionIsValid(session) {
   return session && session.ping() === "valid";
}

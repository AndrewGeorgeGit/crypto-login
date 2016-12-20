const mocha = require("mocha");
const sinon = require("sinon");
const assert = require("assert");
const Endpoint = require("../endpoint");
const DatabaseReceipt = require("../receipt");
const Credentials = require("../database").Credentials;
const Request = require("http").IncomingMessage;
const Response = require("http").ServerResponse;

describe("Endpoint", function() {
   describe("#setFunction", function() {
      const ep = new Endpoint();
      it("throws if function does not exist", () => {
         try { ep.setFunction("does_not_exist", () => {}); }
         catch(err) { return; }
         throw Error();
      });
      it("redirect: throws", () => {
         try { ep.setFunction("redirect", () => {}); }
         catch(err) { return; }
         throw Error();
      });
      it("start/react: throws if non-function value is not provided", () => {
         try { ep.setFunction("start", 22); }
         catch(err) { return; }
         throw Error();
      });
      it("start: changes value", () => {
         const original = ep.functions.start, func = () => {};
         ep.setFunction("start", func);
         assert(ep.functions.start !== original, "#start is no longer its original value");
         assert(ep.functions.start === func, "#start was set to the passed value");
      });
      it("react: changes value", () => {
         const original = ep.functions.react;
      });
   });

   describe("#setRedirect", function() {
      const ep = new Endpoint();

      const redirects = {success: null, failure: ""}
      it("success: throws if not string", () => ep.setRedirect(redirects));

      redirects.success = ""; redirects.failure = null;
      it("failure: throws if not string", () => ep.setRedirect(redirects));

      const original = ep.redirects;
      redirects.failure = "path";
      it("changes value", () => {
         ep.setRedirect(redirects);
         assert(original !== ep.redirects, "the value is no what it was originally was");
         assert(ep.redirects === redirects, "the value is equal to what we set it to");
      })
   });

   describe("#redirect", function() {
      const receipt = new DatabaseReceipt();
      const ep = new Endpoint();

      ep.setRedirect({success: "success", failure: "failure"});

      describe("case: success", function() {
         let response = new Response(new Request());
         receipt.setSuccess(true);
         ep.functions.redirect.bind(ep)(receipt, null, response, ()=>{});
         it("response has correct status code", () => assert(response.statusCode === 303));
         it("Location header set to 'success'", () => assert(response.getHeader("Location") === "success"));
      });

      describe("case: failure", function() {
         let response = new Response(new Request());
         receipt.setSuccess(false);
         ep.functions.redirect.bind(ep)(receipt, null, response, () => {});
         it("response has correct status code", () => assert(response.statusCode === 303));
         it("Location header set to 'failure'", () => assert(response.getHeader("Location") === "failure"));
      });



      describe("case: no redirects set", function() {
         let response = new Response(new Request());
         ep.redirects = null;
         ep.functions.redirect.bind(ep)(receipt, null, response, () => {});
         it("response has default status code 200", () => assert(response.statusCode === 200));
         it("no location header set", () => assert(!response.getHeader("Location")));
      });
   });

   describe("#run", function() {
      //assure start, react, redirect are  called once
      describe("control flow", function() {
         const receipt = new DatabaseReceipt("username");
         receipt.setSuccess(true);

         const ep = new Endpoint();
         ep.setFunction("start", function(credentials, callback) {
            callback(null, receipt);
         });

         const runSpy = sinon.spy(ep, "run"),
            startSpy = sinon.spy(ep.functions, "start"),
            reactSpy = sinon.spy(ep.functions, "react");
            redirectSpy = sinon.spy(ep.functions, "redirect"),
            nextSpy = sinon.spy();

         const credentials = new Credentials({$username: "username"}),
            request = new Request(),
            response = new Response(request);

         ep.run(credentials, request, response, nextSpy);
         it("#start (called second)", () => assert(startSpy.calledAfter(runSpy)));
         it("#react (called third)", () => assert(reactSpy.calledAfter(startSpy)));
         it("#redirect (called fourth)", () => assert(redirectSpy.calledAfter(reactSpy)));
         it("#next (called fifth)", () => assert(nextSpy.calledAfter(redirectSpy)));
         it("#start arguments", () => assert(startSpy.calledWith(credentials)));
         it("#react arguments", () => assert(reactSpy.calledWith(receipt, request, response)));
         it("#redirect arguments", () => assert(redirectSpy.calledWith(receipt, request, response)));
         it("#run called once", ()=>assert(runSpy.calledOnce));
         it("#start called once", () => assert(startSpy.calledOnce));
         it("#react called once", () => assert(reactSpy.calledOnce));
         it("#redirect called once", () => assert(redirectSpy.calledOnce));
         it("#next called once", () => assert(nextSpy.calledOnce));
      });

      describe("#start throws an error", function() {

      });
   });
});

const mocha = require("mocha");
const sinon = require("sinon");
const assert = require("assert");
const SecureLoginEndpoint = require("../endpoint.js");

describe("API", function() {
   describe("#setProperty", function() {
      const api = require("../api.js");
      it("changes value if valid property and value provided", () => {
         const previousValue = api.settings.namespace;
         api.setProperty(["namespace"], "test");
         assert(api.settings.namespace !== previousValue, "not equal to previous value");
         assert(api.settings.namespace === "test", "equals passed value");
      });

      it("returns self", () => {
         assert(api.setProperty(["namespace"], "test") === api);
      });

      it("use: throws if non-boolean value supplied", () => {
         try { api.setProperty(["use"], 22); }
         catch(err) { return; }
         throw new Error();
      });

      it("namespace: throws if non-string value supplied", () => {
         try { api.setProperty(["namespace"], 22); }
         catch(err) { return; }
         throw new Error();
      });

      it("throws if property does not exist", () => {
         try { api.setProperty(["nonexistent"], 22); }
         catch(err) { return; }
         throw new Error();
      });
   });

   describe("#on", function() {
      //constructing testable SecureLoginApi object for each test
      let api;
      beforeEach(function() {
         api = require("../api.js");
         api.endpoints = {
            "test-endpoint": new SecureLoginEndpoint()
         };
      });

      it("updates redirects, react", () => {
         const setRedirectSpy = sinon.spy(api.endpoints["test-endpoint"], "setRedirect");
         const setFunctionSpy = sinon.spy(api.endpoints["test-endpoint"], "setFunction");
         const redirects = {success: "s", failure: "f"}, react = function react(){};
         api.on("test-endpoint", redirects, react);
         assert(setRedirectSpy.calledOnce, "setRedirect called once");
         assert(setFunctionSpy.calledOnce, "setFunction called once");
         assert(setRedirectSpy.calledWithExactly(redirects), "setRedirect called with passed object");
         assert(setFunctionSpy.calledWithExactly("react", react), "setFunction called with passed function");

      });

      it("returns self", () => {
         assert(api.on("test-endpoint", null, ()=>{}) === api);
      });

      describe("case: illegal parameters provided", function() {
         it("throws if endpoint is not passed", () => {
            try{ api.on(); }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if endpoint is not a string", () => {
            try { api.on(22, null, ()=>{}); }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if endpoint does not exist", () => {
            try{ api.on("nonexistent endpoint", null, ()=>{}) }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if routes is not an object or null", () => {
            try{ api.on("test-endpoint", 22, ()=>{}); }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if routes does not contain success", () => {
            try{ api.on("test-endpoint", {failure: "hello"}, ()=>{}); }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if routes does not contain failure", () => {
            try{ api.on("test-endpoint", {success: "hello"}, ()=>{}); }
            catch(err) { return; }
            throw new Error();
         });

         it("throws if react is not a function or null", () => {
            try{ api.on("test-endpoint", null, 22); }
            catch(err) { return; }
            throw new Error();
         });

         it("does not throw if routes is null", () => {
            api.on("test-endpoint", null, ()=>{});
         });
      });
   });

   describe("#router", function() {
      //constructing testable SecureLoginApi object
      const api = require("../api.js");
      api.endpoints = {
         "test-endpoint": {
            run: (_1, _2, _3, next) => next()
         }
      };

      //
      const nextSpy = sinon.spy();
      const runSpy = sinon.spy(api.endpoints["test-endpoint"].run);

      beforeEach(function() {
         api.settings.use = true;
         nextSpy.reset();
         runSpy.reset();
      });

      describe("case: use false or invalid endpoint", function() {
         api.settings.use = false;
         api.router(null, null, null, nextSpy);
         it("next is called once", () => assert(nextSpy.calledOnce));
         it("run is not called", () => assert(runSpy.callCount === 0));
      });

      describe("case: incorrect namespace", function() {
         it("next is called once", () => assert(nextSpy.calledOnce));
         it("run is not called", () => assert(runSpy.callCount === 0));
      });

      describe("case: invalid endpoint", function() {
         it("next is called once", () => assert(nextSpy.calledOnce));
         it("run is not called", () => assert(runSpy.callCount === 0));
      });

      describe("case: valid endpoint", function() {
         it("run is called first");
         it("next is called second");
         it("run is called once");
         it("next is called once");
      });
   });
});

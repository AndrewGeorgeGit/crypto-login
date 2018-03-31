const SecureLoginEndpoint = require("./endpoint");
const SecureLoginDatabase = require("./database");
const SecureLoginSessionManager = require("./session");
const SecureLoginCredentials = require("./credentials");
const slCodes = require("./codes");
const Receipt = require("./receipt");

class SecureLoginApi {
   constructor() {
      this.settings = {
         use: true,
         namespace: "secure-login"
      };

      const endpointStartFuncs = {
         "add-user": SecureLoginDatabase.addUser,
         "remove-user": SecureLoginDatabase.removeUser,
         "remove-user-auth": SecureLoginDatabase.removeUserAuth,
         "change-username": SecureLoginDatabase.changeUsername,
         "change-username-auth": SecureLoginDatabase.changeUsernameAuth,
         "change-password": SecureLoginDatabase.changePassword,
         "change-password-auth": SecureLoginDatabase.changePasswordAuth,
         "login": SecureLoginDatabase.authenticateUser,
         "logout": (credentials, callback) =>  callback(null, new Receipt(credentials.get("$username")))
      }

      this.endpoints = {};
      for (const endpoint in endpointStartFuncs) {
         this.endpoints[endpoint] = new SecureLoginEndpoint();
         this.endpoints[endpoint].setFunction("start", endpointStartFuncs[endpoint]);
      }

      //login, logout have auxillary functionality after dealing with the database
      this.endpoints.login.functions._react = function(receipt, req, res, next) {
         if (!receipt.success) { next(); return; }
         SecureLoginSessionManager.authenticate(next);
      };

      this.endpoints.logout.functions._react = function(receipt, req, res, next) {
         if(!req.session || !req.session.authenticated || !SecureLoginSessionManager.settings.use) { //can't logout if no sl authenticated session
            receipt.setSuccess(false);
            receipt.setFailCode(slCodes.NOT_AUTHENTICATED);
            next();
         } else {
            receipt.setSuccess(true);
            SecureLoginSessionManager.unauthenticate(req, res, next);
            next();
         }
      };
   }

   setProperty(property, value) {
      switch(property[0]) {
         case "use":
         if (typeof value !== "boolean") throw new TypeError('sl.api.setProperty: desired sl.api."' + property[0] +'" value is not of required type boolean.');
            break;
         case "namespace":
            if (typeof value !== "string") throw new TypeError('sl.api.setProperty: desired sl.api."' + property[0] +'" value is not of required type string.');
            break;
         default:
				throw new ReferenceError('sl.api.setProperty: "' + property[0] + '" is not a sl.api property. You cannot set its value.');
				break;
      }
      this.settings[property[0]] = value;

      return this;
   }

   on(endpoint, redirects, react) {
      if(!endpoint) {
         throw new ReferenceError("sl.api.on: no endpoint was passed");
      } else if (typeof endpoint !== "string") {
         throw new TypeError("sl.api.on: endpoint must be of type string");
      } else if (!(endpoint in this.endpoints)) {
         throw new Error("sl.api.on: invalid endpoint passed");
      } else if (redirects && ((typeof redirects !== "object") || (!("success" in redirects) || !("failure" in redirects)))) {
         throw new Error("sl.api.on: redirects must either be null or an object with success, failure as members.");
      } else if (react && typeof react !== "function") {
         throw new TypeError("sl.api.on: react must be of type function.");
      }

      this.endpoints[endpoint].setRedirect(redirects);
      this.endpoints[endpoint].setFunction("react", react);

      return this;
   }

   router(req, res, next) {
      if (!this.settings.use) { next(); return; }

      const url = require("path").parse(req.url), endpoint = url.base;
      if (url.dir !== this.settings.namespace) { next(); return; }
      else if (!(endpoint in this.endpoints)) { next(); return; }

      let data = "";
      req.on("data", d => data += d)
         .on("end", () => {
            const credentials = SecureLoginCredentials(require("querystring").parse(data))
            this.endpoints[endpoint].run(credentials, req, res, next);
         });
   }
}

module.exports = SecureLoginApi;

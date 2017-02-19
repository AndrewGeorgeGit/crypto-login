const crypto = require("crypto");
const cookie = require("cookie");
const slCodes = require("./codes.js");





class Session {
   constructor(id, idleTime, expireTime) {
      this.id = id;
      this.data = {};
      this.times = { created: new Date() };
      this.times.lastPinged = this.times.created;
      this.times.expires = expireTime === -1 ? null : new Date(this.times.created.valueOf() + expireTime);
      this.times.idles = idleTime === -1 ? null : idleTime;
      this.authenticated = false;
   }

   set(property, value) {
      this.data[property] = value;
      return this;
   }

   get(property) {
      return this.data[property];
   }

   remove(property) {
         delete this.data[property];
         return this;
   }

   //updates lastPinged if the session has not idled or expired
   ping() {
      const currTime = new Date();
      if (this.times.expires && currTime > this.times.expires) return "expired";
      else if (this.times.idles && currTime - this.times.lastPinged > this.times.idles) return "idle";
      this.times.lastPinged = currTime;
      return "valid";
   }
}





class SecureLoginSessionManager {
   constructor() {
		this.anonCookie = "slid0";
		this.authCookie = "slid1";
      this.sessions = {};
      this.settings = {
			use: true,
			secure: true,
			anon: true,
			auth: true,
         id_length: 32,
			timeouts: {
				anon: { idle: 0, max: 1000 * 60 * 60 * 24 * 365 * 10 },
				auth: {	idle: 60 * 60 * 1000, max: -1	}
			}
		};
   }

   setProperty(property, value) {
      switch(property[0]) {
         case "use":
         case "secure":
         case "anon":
         case "auth":
            if (typeof value !== "boolean")  throw new TypeError("sl.session.setProperty: desired sl.session." + property[0] + " value is not of required type boolean.");
            this.settings[property[0]] = value;
            break;
         case "id_length":
            if (typeof value !== "number")  throw new TypeError("sl.session.setProperty: desired sl.session." + property[0] + " value is not of required type number.");
            this.settings[property[0]] = value;
            break;
         case "timeouts":
            if (typeof value !== "number")  throw new TypeError("sl.session.setProperty: desired sl.session." + setting + " value is not of required type number.");
            try {
               //seeing if desired timeout exists
               const setting = this.settings[property[0]][property[1]];
               const settingValue = setting[property[2]];
               if (!settingValue) throw new ReferenceError("sl.session.setProperty: '" + property.join(".") + "' is not a sl.session property. You cannot set its value");

               //setting property
               setting[property[2]] = value === -1 ? -1 : value * 1000;
            } catch (err) {
               throw err;
            }
            break;
         default:
				throw new ReferenceError('sl.session.setProperty: "' + property[0] + '" is not a sl.session property. You cannot set its value.');
				break;
      }

      return this;
   }

   run(req, res, next) {
      if (!this.settings.use) { next(); return; }
      const cookies = cookie.parse(req.headers.cookie || "");
      const session = this.sessions[cookies[this.authCookie] || cookies[this.anonCookie]];
      if (!session) {
         if (!this.settings.anon) { next(); return; } //don't automatically attach session if not desired

         this.generateSessionId((err, sessionId) => {
            if (err) {
               const e = new Error("sl.session.run: couldn't generate session id");
               e.slCode = slCodes.SESSION_ID_ERROR;
               e.err = err;
               next(e);
               return;
            }

            sessionId = sessionId.toString('hex');
            req.session = new Session(sessionId, this.settings.timeouts.anon.idle, this.settings.timeouts.anon.max);
            this.setCookie(res, this.anonCookie, sessionId);
            this.sessions[sessionId] = req.session;
            next();
         });
         return;
      } else if (session.ping() !== "valid") { //invalid session present
         delete this.sessions[session.id];
         this.setCookie(res, session.authenticated ? this.authCookie : this.anonCookie); //removing it client side
         this.run(req, res, next); //go through to attach new session
         return;
      } else { //valid session is present
         req.session = session;
      }

      next();
   }

   authenticate(req, res, next) {
      if (!this.settings.use || !this.settings.auth) { next(); return; }

      this.generateSessionId((err, sessionId) => {
         if (err) {
            const e = new Error("sl.session.run: couldn't generate session id");
            e.slCode = slCodes.SESSION_ID_ERROR;
            e.err = err;
            next(e);
            return;
         }

         //saving previous sesions
         const anonSession = req.session;

         //adding auth session
         sessionId = sessionId.toString('hex');
         req.session = new Session(sessionId, this.settings.timeouts.auth.idle, this.settings.timeouts.auth.max);
         req.session.authenticated = true;
         this.setCookie(res, this.authCookie, sessionId);
         this.sessions[sessionId] = req.session;

         //linking anon and auth sessions
         if (anonSession) {
            req.session.data = anonSession.data; //use already established data
            anonSession.lastPinged = req.session.lastPinged; //auth session will now be the one pinged
         }

         next();
      });
   }

   unauthenticate(req, res, next) {
      if (!req.session || !req.session.authenticated || !this.settings.auth) { //nothing to do if no authenticated session attached
         next();
         return;
      }

      //removing authenticated session client and server side
      delete this.sessions[req.session.id];
      this.setCookie(res, this.authCookie);

      //attaching anon session if present
      const anonSessionId = cookie.parse(req.headers.cookie || "")[this.anonCookie];
      req.session = this.sessions[anonSessionId];

      next();
   }

   setCookie(res, name, value = "") {
      const options = { //default options will cause the cookie to be invalidated client-side
         httpOnly: true,
         secure: this.settings.secure,
         path: "/",  //todo: why?
         maxAge: 0,
         expires: new Date(Date.now() - 1000) //for IE
      };

      if(value) {
            const maxAge = this.settings.timeouts[name === this.anonCookie ? "anon" : "auth"].max;
            if (maxAge === -1) options.maxAge = options.expires = undefined;
            else {
               //todo: these are not guaranteed to create the same cookie
               options.maxAge = maxAge / 1000;
               options.expires = this.sessions[value].times.expires;
            }
      }

      let setCookieHeader = res.getHeader('Set-Cookie');
      const newCookie = cookie.serialize(name, value, options);
      if (!otherCookies) {
         setCookieHeader = [ newCookie ];
      } else if (typeof setCookieHeader === "string") {
         setCookieHeader = [ setCookieHeader, newCookie ];
      } else { //assummed header is valid, the only remaing possibility is an array
         setCookieHeader.push(newCookie);
      }
      res.setHeader('Set-Cookie', setCookieHeader);
   }

   generateSessionId(cb) {
      crypto.randomBytes(this.settings.id_length, cb);
   }

   on(event, action) {
      //todo: create, idle, expire, auth, unauth
   }
}





module.exports = exports = new SecureLoginSessionManager();
exports.SecureLoginSessionManager = SecureLoginSessionManager;
exports.Session = Session;

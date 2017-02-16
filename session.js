const crypto = require("crypto");
const cookie = require("cookie");
const slCodes = require("./codes.js");





function generateSessionId(cb) {
   crypto.randomBytes(32, cb); //todo: remove hardcoded values
}





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
   }

   get(property) {
      return this.data[property];
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
			timeouts: {
				anon: { idle: 0, max: 1000 * 60 * 60 * 24 * 365 * 10 }, //does this wreck the cookie?. todo: what happens if non-integers? Negative? Why can't we use Number.MAX_SAFE_INTEGER?
				auth: {	idle: 60 * 60 * 1000, max: -1	}	//todo: fix session-binding issue if anon session expires before auth session, make these only set to integer values, throw an error if max < idle?
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
         case "timeouts":
            if (typeof value !== "number")  throw new TypeError("sl.session.setProperty: desired sl.session." + setting + " value is not of required type number."); //todo: make sure floating-point values aren't added
            try {
               const setting = this.settings[property[0]][property[1]];
               if (!setting[property[2]]) throw new Error();
               setting[property[2]] = value;
            } catch (_) {
               throw new ReferenceError("sl.session.setProperty: '" + property.join(".") + "' is not a sl.session property. You cannot set its value");
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

         generateSessionId((err, sessionId) => {
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
         this.run(req, res, next); //go through to attach new session
         return;
      } else { //valid session is present
         req.session = session;
      }

      next();
   }

   setCookie(res, name, value = "") { //default value means to clear cookie
      const options = {
         httpOnly: true,
         secure: this.settings.secure,
         path: "/",  //todo: why?
         maxAge: 0   //todo: IE integration (expires)
      };

      if(value) {
            options.maxAge = this.settings.timeouts[name === this.anonCookie ? "anon" : "auth"].max;
            if (options.maxAge === -1) options.maxAge = undefined;
      }

      res.setHeader('Set-Cookie', cookie.serialize(name, value, options));
   }

   on(event, action) {
      //todo: create, idle, expire
   }
}





module.exports = exports = SecureLoginSessionManager;
exports.Session = Session;

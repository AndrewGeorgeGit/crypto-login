const crypto = require("crypto");
const cookie = require('cookie');





class SecureLoginSession {
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
			//boolean properties
			case "use":
			case "anon":
			case "auth":
			case "secure":
				if (typeof value !== "boolean") throw new TypeError('sl.sessions.setProperty: desired sl.sessions."' + property[0] +'" value is not of reuqired type boolean.'); //todo: throw error checks into function
				this.settings[property[0]] = value;
				break;
			case "timeouts":
				//property = ['timeouts', 'anon', 'idle'/'max'
				if (property[1] !== 'anon' && property[1] !== 'auth') throw new ReferenceError('sl.sessions.setProperty: ' + property[1] + ' is not an sl.sessions.timeouts property. You cannot set its value.');
				else if (property[2] !== 'idle' && property[2] !== 'max') throw new ReferenceError('sl.sessions.setProperty: ' + property[2] + ' is not an sl.sessions.timeouts.' + property[1] + ' property. You cannot set its value.');
				else if (typeof value !== "number") throw new TypeError('sl.sessions.setProperty: desired sl.sessions.' + `${property[0]}.${property[1]}.${property[2]}` +' value is not of reuqired type number.');
				if (value !== -1) value *= 1000; //converting to milliseconds
				this.settings[property[0]][property[1]][property[2]] = value;
				break;
			default:
				throw new ReferenceError('sl.sessions.setProperty: "' + property[0] + '" is not an sl.sessions property. You cannot set its value.');
				break;
		}
	}

	createSession() { //creates new session and adds it to sessions object
			return generateId().
			then((id) => {
				//creating and intializing session
				let session = new Session(id);
				this.sessions[id] = session; //not really concerned about hash collision
				return Promise.resolve(session);
			});
	}

	getSessions(cookies) { //Gets sessions associated with cookies[this.anonCookie] and cookies[this.authCookie]
		const localSessions = {
			anon: { key: undefined, session: undefined },
			auth: { key: undefined,	session: undefined }
		};

		cookies = cookie.parse(cookies || '');
		localSessions.anon.key = cookies[this.anonCookie];
		localSessions.auth.key = cookies[this.authCookie];

		if( !(localSessions.anon.session = this.sessions[localSessions.anon.key]) ) {
			localSessions.anon.session = { isValid: ()=>false };
		}

		if ( !(localSessions.auth.session = this.sessions[localSessions.auth.key]) ) {
			localSessions.auth.session = { isValid: ()=>false };
		}

		return localSessions;
	}

	attachCookie(res, name, value = "") { //attaches cookie to response object
		//max age
		let maxAge = undefined;
		if (value === "") { //clear the cookie
			value = "";
			maxAge = 0;
		} else {
			maxAge = this.settings.timeouts[(name === this.authCookie) ? "auth" : "anon"].max;
			if (maxAge === -1) { maxAge = null; } //todo: define constant
		}

		//secure
		const secure = this.settings.secure;

		//path
		const path = "/"; //todo: why do I have to set it to this when routing through api?

		res.setHeader("Set-Cookie", cookie.serialize(name, value, {
			httpOnly: true,
			secure: secure,
			maxAge: maxAge / 1000,
			path: path
		})); //todo: I.E. integration
	}

	invalidateSession(res, cookieName, id) { //Destroys session client and server side
		delete this.sessions[id];
		this.attachCookie(res, cookieName, "");
		//todo: more creative stuff if the session is authenticated
		//issue: auth created -> anon destroyed and recreated -> publics are out-of-sync
	}

	attachSession(req, res) { //Finds/creates a valid session object to attach to the http request, todo: convert to middleware function
		if (!this.settings.use) return Promise.resolve();
		
		return new Promise(function(fufill, reject) {
			let s = this.getSessions(req.headers.cookie);

			if (this.settings.auth && s.auth.key) { //attempt to attach valid auth session
				if (s.auth.session.isValid()) {
					req.session = s.auth.session;
					s.auth.session.update();
					fufill();
					return;
				} else {
					this.invalidateSession(res, this.authCookie, s.auth.key);
				}
			}

			if (this.settings.anon && s.anon.key) { //attempt to attach valid anon session
				if (s.anon.session.isValid()) {
					req.session = s.anon.session;
					s.anon.session.update();
					fufill();
					return;
				} else {
					this.invalidateSession(res, this.anonCookie, s.anon.key);
				}
			}

			if (this.settings.anon) { //create new anon session
				this.createSession()
					.then(session => {
						req.session = session;
						this.attachCookie(res, this.anonCookie, session.id);
						fufill();
					}).catch(err => { console.log(err); reject(); });
			} else { //todo: tacked on
				fufill();
			}
		}.bind(this));
	}

	authenticate(req, res) {
		return new Promise(function (fufill, reject) {
			if (req.session && req.session.authenticated) { fufill(); return; } //todo: what about reauthenication?
			this.createSession().
				then(session => {
					session.authenticated = true;
					if (req.session) { //if anonymous session exists, bind the sessions
						session.lastUsed = req.session.lastUsed;
						session.data.public = req.session.data.public;
					}
					req.session = session;
					this.attachCookie(res, this.authCookie, session.id);
					fufill();
				});
		}.bind(this));
	}

	unauthenticate(req, res) {
		return new Promise(function (fufill, reject) {
			if (!req.session || !req.session.authenticated) { fufill(); return; }
			invalidateSession(res, this.authCookie, req.session[id]);
			fufill();
		}.bind(this));
	}
}





//singleton
let sessionManager = new SecureLoginSession();





class Session {
	constructor(id) {
		this.id = id;
		this.created = new Date();
		this.lastUsed = new Date(this.created.valueOf());
		this.authenticated = false;
		this.data = {
			public: {},
			private: {}
		};
	}

	isValid() { //returns true if session has yet to expire
		let timeouts = sessionManager.settings.timeouts[this.authenticated ? 'auth' : 'anon'];
		let time = Date.now(),
			idletime = time - this.lastUsed,
			lifetime = time - this.created;
		return ((timeouts.idle === 0) || (idletime <= timeouts.idle)) //todo: define idle indicators as constants
			   && ((timeouts.max === -1) || (lifetime <= timeouts.max));
	}

	update() { //updates the last used time
		this.lastUsed.setTime(Date.now());
	}

	set(key, val, secure = false) { //todo: error checking, only update private if authenticated
		let obj = secure ? this.data.private : this.data.public;
		obj[key] = val;
	}

	get(key) { //todo: what if private, public both have same key?
		return this.data.private[key] || this.data.public[key];
	}
}





function generateId() {
	return new Promise(function(resolve, reject) {
		crypto.randomBytes(32, (err, buf) => { //todo: remove hardcoded value
			if (err) { reject(err); return; }
			resolve(crypto.createHash('sha1').update(buf).digest('hex'));
		});
	});
}





module.exports = sessionManager;
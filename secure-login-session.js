const crypto = require("crypto");
const cookie = require('cookie');

class Session {
	constructor(id) {
		this.created = new Date();
		this.id = id;
		this.ip = null;
		this.userAgent = null;
		this.authenticated = false;
		this.unauthenticated = null;
	}
}

//default behavior: authenticated sessions only
class SecureLoginSession {
	constructor() {
		this.cookieName = "slid";
		this.sessions = {};
		this.settings = {
			'login on signup': true,
			'auth timeout': 30 * 1000,
			'anon timeout': 2000//365 * 100 * 1000
		}
	}

	attachSession(req, res) {
		return new Promise(function (resolve, reject) {
			let session = null;
			if ("cookie" in req.headers) {
				session = this.sessions[ cookie.parse(req.headers.cookie)[this.cookieName] ];
			}

			if (!session) {
				createSessionId(id => {
					req.session = new Session(id);
					this.sessions[id] = req.session;
					res.setHeader('Set-Cookie', cookie.serialize(this.cookieName, id, {
						httpOnly: true,
						maxAge: this.settings['anon timeout']
					}));
					resolve();
				});
			} else {
				if (this.isExpired(session)) {
					delete this.sessions[session.id];
					//renew
					resolve();
				} else {
					req.session = session;
					resolve();
				}
			}
		}.bind(this));
	}

	//makes sure session is still active
	isExpired(session) { //this should be an object of the session, not the manager
		let maxLifetime = this.settings[ session.authenticated ? 'auth timeout' : 'anon timeout'];
		return (new Date() - session.created) > maxLifetime;
	}
}

function createSessionId(cb) {
	crypto.randomBytes(32, (err, buf) => { //error cheeck
		cb(crypto.createHash('sha1').update(buf).digest('hex'));
	});
}

module.exports = new SecureLoginSession();
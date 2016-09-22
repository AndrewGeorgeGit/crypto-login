const assert = require('assert');
const winston = require('winston');

class SecureLoginApi {
	/* ---------- constructor ---------- */
	constructor(endpoints, start_funcs) {
		//asserting my own code, todo: check for uniqueness of endpoints
		assert(endpoints.length === start_funcs.length);
		assert(!endpoints.find(e => typeof e !== "string"));
		assert(!start_funcs.find(e => e.length !== 1));

		//endpoints and their related functions are stored here
		this.callbacks = {};
		for (let i = 0; i < endpoints.length; i++) {
			this.callbacks[endpoints[i]] = {
				"start": start_funcs[i],
				"react": SecureLoginApi.createDefaultReactFunc(endpoints[i])
			};
		}
	}

	/* ---------- router ----------*/
	router(req, res, next = ()=>{}) { //how is request going to work with express middleware?
		//validating parameters passed
		if (!req || !res) {
			//todo: log
		}

		//
		const url = require('path').parse(req.url);
		if (url.dir !== "/secure-login") {
			//next(req, res);
			next();
			return;
		}

		let body = "";
		req.on('data', d => body += d)
		   .on('end', function() {
		   		let endpoint = this.callbacks[url.base];
		   		endpoint.start(require('querystring').parse(body))
		   			.then(result => endpoint.react(result, req, res))
		   			.then(() => next(req, res))
		   			.catch(err => { console.log(err); next(req, res); });
			}.bind(this));
	}

	/* ---------- on ----------*/
	on(endpoint, func) {
		if (typeof func !== "function") {
			winston.warn("sl.api.on: parameter passed is not a valid function");
			return this;
		}

		if (endpoint in this.callbacks) {
			this.callbacks[endpoint].react = func;
		} else {
			winston.warn("sl.api.on: endpoint '%s' does not exist.", endpoint);
		}

		return this;
	}

	/* ---------- default endpoint generataor ---------- */
	static createDefaultReactFunc(endpoint) {
		return function (result, req, res) {
			return new Promise((resolve, reject) => {
				res.end(endpoint + ": " + result);
				resolve();
			});
		}
	}
}

module.exports = SecureLoginApi;
const assert = require('assert');

class SecureLoginApi {
	constructor(endpoints) { //regular expression validation of endpoints
		this.endpoints = {};
		for (let endpoint in endpoints) {
			let epFunc = endpoints[endpoint];

			//parameter validation
			let err = null;
			if (typeof epFunc !== 'function') err = new Error("sl.api.constructor: every endpoint must have associated start function");
			else if (epFunc.length !== 1) err = new Error("sl.api.constructor: not every endpoint start function takes only 1 parameter");
			if (err) { this.endpoints = {}; throw err; } //cleanup before throwing

			//continuing object construction
			this.endpoints[endpoint] = {
				"start": epFunc,
				"react": SecureLoginApi.createDefaultReactFunc(endpoint)
			}
		}
	}

	router(req, res, next) {
		//parameter validation
		if (!req || !res || typeof req !== "object" || typeof res !== "object") throw new Error("sl.api.router: req, res must be non-null objects");
		if (typeof next !== "function") throw new TypeError("sl.api.router: next must be a function");

		const url = require('path').parse(req.url);
		if (url.dir !== "/secure-login") {
			next(req, res);
			return;
		}

		let body = "";
		req.on('data', d => body += d)
		   .on('end', function() {
		   		let endpoint = this.endpoints[url.base];
		   		if (!endpoint) {
		   			console.log(`sl.api.router: ${url.base} is not an endpoint`);
		   			next(req, res);
		   			return;
		   		}

		   		endpoint.start(require('querystring').parse(body))
		   			.then(result => endpoint.react(result, req, res))
		   			.then(() => next(req, res))
		   			.catch(err => { console.log(err); next(req, res); });
			}.bind(this));
	}

	redirect(endpoint, routes) {
		//parameter validation
		if (!('success' in routes) || !('failure' in routes)) throw new Error("sl.api.redirect: routes does not contain both success and failure");

		this.on(endpoint,
                function (result, req, res) {
					return new Promise(function (resolve, reject) {
						let location = "../" + (result ? routes['success'] : routes['failure']);
						res.writeHead(303, {'Location': location});
						res.end();
					}.bind(this));
				});

		return this;
	}

	on(endpoint, func) {
		//parameter validation
		if (typeof endpoint !== "string") throw new TypeError("sl.api.on: endpoint must be of type string");
		if (typeof func !== "function") throw new TypeError("sl.api.on: func must be of type string");
		if (!(endpoint in this.endpoints)) throw new ReferenceError(`sl.api.on: '${endpoint}' is not an endpoint.`);
		if (func.length !== this.endpoints[endpoint].react.length) throw new Error(`sl.api.on: func must have strictly ${this.endpoints[endpoint].react.length} parameters.`);

		this.endpoints[endpoint].react = func;

		return this;
	}

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
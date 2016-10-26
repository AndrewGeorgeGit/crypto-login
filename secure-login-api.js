const assert = require('assert');

class SecureLoginApi {
	constructor(endpoints) { //regular expression validation of endpoints
		this.settings = {
			express: false,
			use: true
		};

		this.endpoints = {};
		for (let endpoint in endpoints) {
			let epFuncs = endpoints[endpoint]; //endpoints[endpoint]; todo: change error checking
			//parameter validation
			let err = null;
			//if (typeof epFuncs !== 'function') err = new Error("sl.api.constructor: every endpoint must have associated start function");
			//else if (epFuncs.length !== 1) err = new Error("sl.api.constructor: not every endpoint start function takes only 1 parameter");
			if (err) { this.endpoints = {}; throw err; } //cleanup before throwing

			//continuing object construction
			this.endpoints[endpoint] = {
				result: undefined,
				start: epFuncs.startFunc,
				receive: (result) => new Promise(function (resolve, reject) {this.result = result; resolve();}.bind(this.endpoints[endpoint])),
				manageSession: epFuncs.sessionFunc,
				react: SecureLoginApi.createDefaultReactFunc(endpoint),
				redirect: Promise.resolve()
			}
		}
	}

	setProperty(property, value) {
		switch(property[0]) {
			//boolean values
			case 'express':
			case 'use':
				if (typeof value !== "boolean") throw new TypeError('sl.api.setProperty: desired sl.api."' + property[0] +'" value is not of required type boolean.');
				this.settings[property[0]] = value;
				break;
			default:
				throw new ReferenceError('sl.api.setProperty: "' + property[0] + '" is not a sl.api property. You cannot set its value.');
				break;
		}
	}

	router(req, res) { //todo: make middleware function
		if (!this.settings.use) return Promise.resolve(); //todo: is this all that need to be done in terms of disabling?
		
		//parameter validation
		if (!req || !res || typeof req !== "object" || typeof res !== "object") throw new Error("sl.api.router: req, res must be non-null objects");

		return new Promise(function (resolve, reject) {
			const url = require('path').parse(req.url);
			if (url.dir !== "/secure-login") {
				resolve();
				return;
			}

			//
			let endpoint = this.endpoints[url.base];
	   		if (!endpoint) {
	   			console.log(`sl.api.router: ${url.base} is not an endpoint`);
	   			resolve();
	   			return;
	   		}

			let body = "";
			req.on('data', d => body += d)
			   .on('end', function() {
			   		endpoint.start(require('querystring').parse(body))
			   			.then(result => endpoint.receive(result))
			   			.then(() => endpoint.manageSession(endpoint.result, req, res))
			   			.then(() => endpoint.react(endpoint.result, req, res))
			   			.then(() => endpoint.redirect(endpoint.result, req, res)) //having to pass more
			   			.then(() => resolve())
			   			.catch(err => { console.log(err, "from sl.api"); resolve(); });
				});
		}.bind(this));
	}

	redirect(endpoint, routes, func = null) {
		//parameter validation
		if (!(endpoint in this.endpoints)) throw new ReferenceError(`sl.api.on: '${endpoint}' is not an endpoint.`);
		if (!('success' in routes) || !('failure' in routes)) throw new Error("sl.api.redirect: routes does not contain both success and failure");1

		this.endpoints[endpoint].redirect = (result, req, res) => {
			return new Promise(function (resolve, reject) {
				let location = "../" + (result ? routes['success'] : routes['failure']);
				res.writeHead(303, {'Location': location});
				res.end();
			});
		};

		if (func === null) this.endpoints[endpoint].react = () => Promise.resolve(); //todo: are we sure we want to overwrite this?
		else this.on(endpoint, func);

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
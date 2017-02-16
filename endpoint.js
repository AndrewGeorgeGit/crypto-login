const DatabaseReceipt = require('./receipt');
const slCodes = require('./codes');

function defaultReactFunction(receipt, req, res, next) {
	next();
}

class Endpoint {
	constructor() {
		this.functions = {
			'start': null,
			'_react': defaultReactFunction, //internal react function
			'react': defaultReactFunction,
			'redirect': function(receipt, req, res, next) {
				if (!this.redirects) { next(); return; } //do nothing if redirects have not been defined
				res.statusCode = 303;
				res.setHeader("Location", this.redirects[receipt.success ? "success" : "failure"]);
				res.end();
				next();
			}
		};
		this.redirects = null; //takes an object with 'success' and 'failure' members
	}

	setFunction(funcName, func) {
		switch(funcName) {
			case "start":
				if (typeof func !== "function") throw new TypeError("sl.Endpoint.setFunction: provided value is not of required type function.");
				this.functions[funcName] = func; //any other function restraints?
				break;
			case "react":
				if (func && typeof func !== "function") throw new TypeError("sl.Endpoint.setFunction: provided value is not of required type function.");
				this.functions[funcName] = func ? func : defaultReactFunction;
				break;
			case "redirect":
				throw new Error(`sl.Endpoint.setFunction: overloading the redirect function is not allowed`);
				break;
			default:
				throw new Error(`sl.Endpoint.setFunction: ${funcName} does not exists`);
				break;
		}
		return this;
	}

	setRedirect(redirects) {
		if (redirects && (typeof redirects.success !== "string" || typeof redirects.failure !== "string")) {
			throw new Error("sl.endpoint.setRedirect: both success and failure must be string values.");
			return;
		}
		this.redirects = redirects;
	}

	run(credentials, req, res, next) {
		this.functions.start(credentials, (err, receipt) => {
			if (err) {
				const e = new Error("sl.endpoint.run: some database error occurred");
				e.slCode = slCodes.DATABASE_ERROR;
				e.err = err;
				next(e);
				return;
			}
			this.functions._react(receipt, req, res, () => {
				this.functions.react(receipt, req, res, () => {
					this.functions.redirect(receipt, req, res, next);
				});
			});
		});
	}
}

exports = module.exports = Endpoint;
exports.defaultReactFunction = defaultReactFunction;

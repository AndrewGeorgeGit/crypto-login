function SecureLoginApi(sl) {
	this.sl = sl;
	this.callbacks = {
		"add-user success": (req, res)=>{ res.end("add-user success"); },
		"add-user failure": (req, res)=>{ res.end("add-user failure"); },
		"remove-user success": (req, res)=>{ res.end("remove-user success"); },
		"remove-user failure": (req, res)=>{ res.end("remove-user failure"); },
		"change-username success": (req, res)=>{ res.end("change-username success"); },
		"change-username failure": (req, res)=>{ res.end("change-username failure"); },
		"change-password success": (req, res)=>{ res.end("change-password success"); },
		"change-password failure": (req, res)=>{ res.end("change-password failure"); },
		"authenticate success": (req, res)=>{ res.end("authenticate success"); },
		"authenticate failure": (req, res)=>{ res.end("authenticate failure"); }
	}
}

SecureLoginApi.prototype.on = function (prop, val) {
	if (!(prop in this.callbacks) || typeof val !== "function") { return; }
	this.callbacks[prop] = val;
};

SecureLoginApi.prototype.router = function (req, res, next = ()=>{}) {
	//move on if API wasn't called
	const url = require('path').parse(req.url);
	if (url.dir !== "/secure-login") {
		console.log("nope");
		next();
		return;
	}




	//
	var queryString = "";
	req.on('data', data => queryString += data);




	//
	req.on('end', function() {
		var data = require("querystring").parse(queryString),
		username = data.username,
		password = data.password,
		updated = data.update;

		switch (url.base.toLowerCase()) {
			case "add-user":
				this.sl.addUser(username, password, err => {
					this.callbacks["add-user " + (err ?	 "failure" : "success")](req, res)
				});
				break;
			case "remove-user":
				this.sl.removeUser(username, err => {
					if (err) { this.callbacks["remove-user failure"](req, res); }
					else { this.callbacks["remove-user success"](req, res); }
					next();
				});
				break;
			case "change-username":
				this.sl.changeUsername(username, changed, err => {
					if (err) { this.callbacks["change-username failure"](req, res); }
					else { this.callbacks["change-username success"](req, res); }
					next();
				});
				break;
			case "change-password":
				this.sl.changePassword(username, changed, err => {
					if (err) { this.callbacks["change-password failure"](req, res); }
					else { this.callbacks["change-password success"](req, res); }
					next();
				});
				break;
			case "authenticate":
				this.sl.authenticate(username, password, (err, success) => {
					if (success) { this.callbacks["authenticate success"](req, res); }
					else { this.callbacks["authenticate failure"](req, res); }
					next();
				})
				break;
			default:
				next();
				return;
		}

	}.bind(this)); //todo: better understand this
};

module.exports = function(sl) {
	return new SecureLoginApi(sl);
}
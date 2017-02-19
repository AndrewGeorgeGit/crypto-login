const slCodes = require('./codes');

class DatabaseReceipt {
	constructor(username) {
		this.username = username;
		this.failReason = slCodes.NONE;
	}

	setSuccess(success) {
		this.success = success;
		return this;
	}

	setFailReason(failReason) {
		this.failReason = failReason;
		return this;
	}
}

module.exports = DatabaseReceipt;

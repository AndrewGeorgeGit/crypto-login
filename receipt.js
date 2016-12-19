const slCodes = require('./codes');

class DatabaseReceipt {
	constructor(username) {
		this.username = username;
		this.failReason = slCodes.NONE;
	}

	setSuccess(success) {
		this.success = success;
	}

	setFailReason(failReason) {
		this.failReason = failReason;
	}
}

module.exports = DatabaseReceipt;

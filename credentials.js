class SecureLoginCredentials {
  constructor(raw) {
    if (!raw) return;
    this.$newUsername = raw.$newUsername;
    this.$newPassword = raw.$newPassword;
    this.$username = raw.$username;
    this.$password = raw.$password;
  }

  set(member, value) {
    this[member] = value;
  }

  get(member) {
    return this[member];
  }

  has(member) {
    return (member in this) && this[member] !== null && this[member] !== undefined; //member exists in object and is defined
  }

  isDatabaseReady() { //true if all rowFormat columns are present
    return this.has("$username") && this.has("$iterations") && this.has("$salt") && this.has("$hash");
  }

  rowFormat() { //returns concise object containing column values
    return {
      $username: this.$username,
      $iterations: this.$iterations,
      $salt: this.$salt,
      $hash: this.$hash
    };
  }

  static copy(oldCredentials) {
    let newCredentials = new SecureLoginCredentials();
    newCredentials.set("$username", oldCredentials.get("$username"));
    newCredentials.set("$password", oldCredentials.get("$password"));
    newCredentials.set("$newUsername", oldCredentials.get("$newUsername"));
    newCredentials.set("$newPassword", oldCredentials.get("$newPassword"));
    return newCredentials;
  }
}

module.exports = exports = SecureLoginCredentials;

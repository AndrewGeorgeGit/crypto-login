const crypto = require("crypto");





settings = {
  iterations: 20000,
  length: 64
};





function setProperty(property, value) {
  switch(property[0]) {
    case "iterations":
    case "length":
      if (typeof value !== "number")  throw new TypeError("sl.hash.setProperty: desired sl.hash.\"" + property[0] +"\" value is not of required type number.");
      if (value < 1) throw new RangeError("sl.hash.setProperty: " + property[0] + "(" + value + ") is not positive.");
      if (Math.round(value) !== value) throw new RangeError("sl.hash.setProperty: " + property[0] + "(" + value + ") is not an interger value.");
      settings[property[0]] = value;
      break;
    default:
      throw new ReferenceError("sl.hash.setProperty: \"" + property[0] + "\" is not a sl.hash property. You cannot set its value.");
      break;
  }
}





/* uses the pbkdf2 algorithm to hash credentials.$password */
function hash(credentials, callback) {
  //generating salt if necessary
  if (!credentials.has("$salt")) {
    crypto.randomBytes(settings.length, (err, salt) => {
      if (err) { callback(err); return; }
      credentials.set("$salt", salt.toString("hex"));
      hash(credentials, callback);
    });
    return;
  }

  //hasing
  crypto.pbkdf2(credentials.get("$password"), credentials.get("$salt"), settings.iterations, settings.length, "sha256", (err, hash) => {
    if (err) { callback(err); return; }
    credentials.set("$hash", hash.toString("hex"));
    credentials.set("$iterations", settings.iterations);
    callback();
  });
}





module.exports = hash;
module.exports.setProperty = setProperty;

//for testing
module.exports.hash = hash;
module.exports.settings = settings;

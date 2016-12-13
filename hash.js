const crypto = require('crypto');





//todo: allow setting of these values
//I dislike arbitrary settings here. These settings need to be accessible (and changeable) elsewhere
settings = {
   iterations: 20000,
   hashLength: 64
}





/* uses the pbkdf2 algorithm to hash credentials.$password */
function hash(credentials, callback) {
   //generating salt if necessary
   if (!credentials.has("$salt")) {
      crypto.randomBytes(settings.hashLength, (err, salt) => {
         if (err) { callback(err); return; }
         credentials.set("$salt", salt.toString("hex"));
         hash(credentials, callback);
      });
      return;
   }

   //hasing
   crypto.pbkdf2(credentials.get("$password"), credentials.get("$salt"), settings.iterations, settings.hashLength, "sha256", (err, hash) => {
      if (err) { callback(err); return; }
      credentials.set("$hash", hash.toString("hex"));
      credentials.set("$iterations", settings.iterations);
      callback();
   });
}





module.exports = hash;

//for testing
module.exports.hash = hash;
module.exports.settings = settings;

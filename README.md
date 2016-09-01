# secure-login
## what it is
secure-login is a Node.js user authentication module that stores cryptographically secure password hashes according to the [these](https://nakedsecurity.sophos.com/2013/11/20/serious-security-how-to-store-your-users-passwords-safely/) guidelines. 

## install
`$ npm install secure-login`

## how it works
secure-login currently uses a default sqlite3 database to manage its table of users.

It hashes passwords by generating a random salt at account creation and running the pbkdf2 algorithm with a HMAC-SHA-256 digest.

## API
```
//initialization
const sl = require("secure-login")();

//configuring secure-login.
//number of times pbkdf2 algorithm will run
//other options you can set: 'hash length', 'database path', 'table', 'username/password hash/salt/iterations column'
sl.set("iteration count", 10000); 

//opens the database
//always call set() functions before start()
//set() and start() calls can be chained
sl.start();

//add a user
login.addUser("username", "password", err => {}); 

//logg in a user. success is a boolean type
login.authenticate("username", "password", (err, success) => {}); 

//update a user's password
log.changePassword("username", "newpassword", err => {});

//remove a user
login.removeUser("username", err => {});
```

## future plans
- add ability to change username
- add more set options, including ones to alter the hashing algorithm's strength
- Passportjs integration
- web server API interface with possible Express integration
- the ability to integrate with other database solutions
- client-side javascript to verify username uniqueness and password strength

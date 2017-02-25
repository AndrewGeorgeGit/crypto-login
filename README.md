# secure-login
## what it is
secure-login (SL) is a Node.js user authentication and management system. User login information is stored in a sqlite3 database, laregely following [these guidelines for password storage.](https://nakedsecurity.sophos.com/2013/11/20/serious-security-how-to-store-your-users-passwords-safely/) There is also an interface for adding/removing users, authenticating users, and updating usernames/passwords.

## install
`$ npm install secure-login`

## getting started
[View the Wiki](https://github.com/DevAndrewGeorge/secure-login/wiki) to see code samples and get caught up to speed.

## future plans
- Actually write a decent README
- Finish implementing tests (some DB functions, login, logout)
- Implement session events (onAuthenticate, onUnauthenticate, onTimeout, etc.)
- Rewrite/strengthen tests
- Passportjs support
- client-side javascript to verify username uniqueness and password strength

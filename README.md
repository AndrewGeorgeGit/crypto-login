# secure-login
## what it is
secure-login (SL) is a Node.js user authentication and management system. User login information is stored in a sqlite3 database, laregely following [these guidelines for password storage.](https://nakedsecurity.sophos.com/2013/11/20/serious-security-how-to-store-your-users-passwords-safely/) There is also an interface for adding/removing users, authenticating users, and updating usernames/passwords.

## install
`$ npm install secure-login`

## setup
```javascript
const sl = require('secure-login').start();

//using SL with a regular http server
require('http').createServer((req, res) => {
  sl.api.router(req, res, next);
}).listen(3000);

function next(req, res) { /* deal with requests not relevant to SL */ }
```
# managing users
## how it works
You can connect your client-side forms by using the [Form API](https://github.com/AndrewGeorgeGit/secure-login/wiki/Form-API). You also have the ability to call associated functions in your code for more low-level control. 

## Form API example
client-side:
```html
<!-- all form actions must be directed towards /secure-login/${ENDPOINT} or they will fall through sl.api.router -->
<!-- endpoints include: add-user, remove-user, change-username, change-password, login -->
<form action='/secure-login/add-user' method=post>
<input type=text name=username required>
<input type=password name=password required>
<input type=submit>
</form>
```

sever-side:
```javascript
//the function passed to the 'on' or 'redirect' methods MUST return a Promise 
let func = (result, req, res) => {
  return new Promise(function(resolve,reject) {
    if (result) { /* user added successfully */ }
    else { /* failed to add user (username taken) */ }
    resolve();
  }
});

//func will be executed after SL attempts to add the user
sl.api.on('add-user', func);

//sl.api.redirect will redirect you to relevant success/failure pages
//func is an optional parameter
sl.api.redirect('add-user', {success: 'dashboard.html', failure: 'try_again.html'}, func);
```

## function calls
```javascript
//initialization
const sl = require("secure-login");

// all functions (1) return a promise and (2) take a single argument 'credentials'
// it is an object with relevant keys from username, password, newUsername, newPassword
sl.authenticate({username: 'user', password: 'pass'});
sl.addUser({username: 'user', password: 'pass'}); 
sl.removeUser({username: 'user'});
sl.changeUsername({username: 'user', newUsername: 'user2'});
sl.changePassword({username: 'user', newPassowrd: 'pass2'});
```

## future plans
- Passportjs support
- Express support
- Session management
- client-side javascript to verify username uniqueness and password strength
- add more to the wiki

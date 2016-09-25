# secure-login
## what it is
secure-login (SL) is a Node.js user authentication and management system. User login information is stored in a sqlite3 database, laregely following [these guidelines for password storage.](https://nakedsecurity.sophos.com/2013/11/20/serious-security-how-to-store-your-users-passwords-safely/) There is also an interface for adding/removing users, authenticating users, and updating usernames/passwords.

## install
`$ npm install secure-login`

## setup
```
const sl = require('secure-login').start();

//using SL with a regular http server
require('http').createServer((req, res) => {
  sl.api.route(req, res, next);
});

function next(req, res) { /* deal with requests not relevant to SL */ }
```
# managing users
## how it works
You can connect your client-side forms by using the [Form API](https://github.com/AndrewGeorgeGit/secure-login/wiki/Form-API). You also have the ability to call associated functions in your code for more low-level control. 

## Form API example
client-side:
```
<!-- all form actions must be directed towards /secure-login/${ENDPOINT} or they will fall through sl.api.router -->
<!-- endpoints include: add-user, remove-user, change-username, change-password, login -->
<form action='/secure-login/add-user' method=post>
<input type=text name=username required>
<input type=password name=password required>
<input type=submit>
</form>
```

sever-side:
```
//call the 'on' method to execute custom code after the desired action is completed
//your custom code MUST return a Promise
sl.api.on('add-user', (result, req, res) => {
  return new Promise(function(resolve,reject) {
    if (result) { /* user added successfully */ }
    else { /* failed to add user (username taken) */ }
    resolve();
  }
});

//call the redirect method to route depending on the desired action's success or failure
//you cannot call both 'on' and 'redirect' for the same endpoint (working on it)
sl.api.redirect('add-user', {success: 'dashboard.html', failure: 'try_again.html'});
```

## function calls
```
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
- allow sl.api.redirect to execute custom code
- client-side javascript to verify username uniqueness and password strength
- add more to wki

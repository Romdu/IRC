var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var http = require('http').Server(app);
var MongoStore = require('connect-mongo')(session);
var io = require('socket.io')(http);
//connect to MongoDB
mongoose.connect('mongodb://localhost/testForAuth');
var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
});
var users = [];
var messages = [];
var typingUsers = [];
io.on('connection', function(socket){
  console.log('a user connected');
  var loggedUser;
  for (i = 0; i < messages.length; i++) {
    if (messages[i].username !== undefined) {
      socket.emit('chat-message', messages[i]);
    } else {
      socket.emit('service-message', messages[i]);
    }
  }
  socket.on('user-login', function (user, callback) {
    // Vérification que l'utilisateur n'existe pas
    var userIndex = -1;
    for (i = 0; i < users.length; i++) {
      if (users[i].username === user.username) {
        userIndex = i;
      }
    }
    if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
      // Sauvegarde de l'utilisateur et ajout à la liste des connectés
      loggedUser = user;
      users.push(loggedUser);
      // Envoi des messages de service
      var userServiceMessage = {
        text: 'You logged in as "' + loggedUser.username + '"',
        type: 'login'
      };
      var broadcastedServiceMessage = {
        text: 'User "' + loggedUser.username + '" logged in',
        type: 'login'
      };
      // Emission de 'user-login' et appel du callback
      io.emit('user-login', loggedUser);
      socket.emit('service-message', userServiceMessage);
      socket.broadcast.emit('service-message', broadcastedServiceMessage);
      messages.push(broadcastedServiceMessage);
      callback(true);
    } else {
      callback(false);
    }
  });
  for (i = 0; i < users.length; i++) {
    socket.emit('user-login', users[i]);
  }

  socket.on('chat-message', function (message) {
    message.username = loggedUser.username;
    io.emit('chat-message', message);
    messages.push(message);
    if (messages.length > 150) {
      messages.splice(0, 1);
    }
  });
  socket.on('show-users', function(message){
    var tex = "<ul>";
    for (i = 0; i < users.length; i++) {
      tex += "<li>"+users[i].username+"</li>"
    }
    tex += "</ul>";
    var msg = tex;
    socket.emit('Commande', msg);
  });
  socket.on('change-name', function(name){
    if (loggedUser !== undefined) {
      older_name = loggedUser.username;
      io.emit('user-logout', loggedUser);
      var userIndex = users.indexOf(loggedUser);
      users[userIndex].username = name;
      loggedUser.username = name;
      io.emit('user-login', loggedUser);
      var msg = 'The name of "'+ older_name +'" has been changed in "' + loggedUser.username + '"';
      io.emit('Commande', msg);
    }
  });
  socket.on('start-typing', function () {
    // Ajout du user à la liste des utilisateurs en cours de saisie
    if (typingUsers.indexOf(loggedUser) === -1) {
      typingUsers.push(loggedUser);
    }
    io.emit('update-typing', typingUsers);
  });
  socket.on('stop-typing', function () {
    var typingUserIndex = typingUsers.indexOf(loggedUser);
    if (typingUserIndex !== -1) {
      typingUsers.splice(typingUserIndex, 1);
    }
    io.emit('update-typing', typingUsers);
  });

  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast d'un 'service-message'
      var serviceMessage = {
        text: 'User "' + loggedUser.username + '" disconnected',
        type: 'logout'
      };
      socket.broadcast.emit('service-message', serviceMessage);
      var typingUserIndex = typingUsers.indexOf(loggedUser);
      if (typingUserIndex !== -1) {
        typingUsers.splice(typingUserIndex, 1);
      }
      // Suppression de la liste des connectés
      var userIndex = users.indexOf(loggedUser);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }
      // Ajout du message à l'historique
      messages.push(serviceMessage);
      // Emission d'un 'user-logout' contenant le user
      io.emit('user-logout', loggedUser);
    }
  });
});
//use sessions for tracking logins
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

// parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// serve static files from template
app.use(express.static(__dirname + '/templateLogReg'));

// include routes
var routes = require('./routes/router');
app.use('/', routes);
//app.use('/register', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('File Not Found');
  err.status = 404;
  next(err);
});

// error handler
// define as the last app.use callback
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});


// listen on port 8080

http.listen(8080, function(){
  console.log('listening on *:8080');
});
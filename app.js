var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');
var http = require('http').Server(app);
var MongoStore = require('connect-mongo')(session);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/testForAuth');
var db = mongoose.connection;
var Room = require('./models/room');
var rooms = [];
var users = [];
//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
  function result_room(){
    db.collection("rooms").find().toArray(function(err, result) {
      if (err) throw err;
        for(var o = 0; o < result.length; o++){
          rooms.push(result[o].name);
        }
    });
  }
  result_room();
  //connection socket
  io.sockets.on('connection', function (socket) {
    socket.userRoom = [];
    console.log('a user connected');
    //emet les room existante
    socket.emit('updaterooms', rooms, socket.userRoom);
    //ouvre une nouvelle room
    socket.on('openRoom', function(newroom){
      socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom, newroom);
      // update socket session room title
      socket.userRoom.push(newroom);
      socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room', newroom);
      var user = {
          room : newroom,
          username : socket.username
      }
      users.push(user);
      socket.emit('add_user', users, newroom);
      socket.broadcast.to(newroom).emit('add_user', users, newroom);
      socket.emit('updaterooms', rooms, socket.userRoom);
    });

    socket.on('leftRoom', function(room, int){
      socket.broadcast.to(room).emit('updatechat', 'SERVER', socket.username+' has left this room', room);
      socket.leave(room);
      if(room == socket.roomActu){
        socket.room = null;
      }
      // update socket session room title
      for (var i = 0; i < users.length; i++) {
        if(users[i].username == socket.username && users[i].room == room){
          users.splice(i);
        }
      }
      socket.broadcast.to(room).emit('add_user', users, room);
      socket.userRoom.splice(int);
      socket.emit('updaterooms', rooms, socket.userRoom);
    });
    //change le chat actuelle 
    socket.on('switchRoom', function(roomActu){
      socket.join(roomActu);
      socket.roomActu = roomActu;
    })

    socket.on('change-name', function(name){
      var ok = true;
      for(var i = 0; i < users.length; i++){
        if(users[i].username == name){
          ok = false;
        }
      }
      if(ok){
        socket.emit('updatechat', 'SERVER', "Your name has changed in "+name, socket.roomActu);
        for (var i = 0; i < users.length; i++) {
          if(users[i].username == socket.username){
            users[i].username = name;
            socket.broadcast.to(users[i].room).emit('add_user', users, users[i].room);
            socket.emit('add_user', users, users[i].room);
          }
        }
        for(var i = 0; i < socket.userRoom.length; i++){
          socket.broadcast.to(socket.userRoom[i]).emit('updatechat', 'SERVER', socket.username+" has changed in "+name, socket.userRoom[i]);
        }
        socket.username = name;
      }
      else{
        socket.emit('updatechat', 'SERVER', "This name is already take");
      }
    })
    socket.on('show-users', function(){
      var ok = "<br/>";
      for (var i = 0; i < users.length; i++) {
        if(users[i].room == socket.roomActu){
          ok += users[i].username+"<br/>";
        }
      }
      socket.emit('updatechat', 'SERVER', ok, socket.roomActu);
    });

    socket.on('list_room', function(room){
      var ok = "<br/>";
      var matcher = new RegExp(room, "i");
      for (var i = 0; i < rooms.length; i++) {
        if(matcher.test(rooms[i])){
          ok += rooms[i]+"<br/>";
        }
      }
      socket.emit('updatechat', 'SERVER', ok, socket.roomActu);
    });

    socket.on('sendchat', function (data) {
      socket.emit('updatechat', socket.username, data, socket.roomActu);
      socket.broadcast.to(socket.roomActu).emit('updatechat', socket.username, data, socket.roomActu);
      // we tell the client to execute 'updatechat' with 2 parameters
      //io.sockets.in(socket.roomActu).emit('updatechat', socket.username, data);
    });

    socket.on('newroom', function (nameRoom) {
      var ok = true;
      for(var y = 0; y < rooms.length; y++){
        if(rooms[y] == nameRoom){
          ok = false
        }
      }
        if (nameRoom.length != 0 && ok || nameRoom.length < 20 && ok) {
          var roomData = {
            name: nameRoom,
          }
          Room.create(roomData, function (error, room) {
            if (error) {
              return next(error);
            }
            else {
              rooms.push(nameRoom);
              for (var i = 0; i < rooms.length; i++) {
                socket.broadcast.to(rooms[i]).emit('updatechat', "SERVER", "New room has been create : "+nameRoom, rooms[i]);
                socket.emit('updatechat', "SERVER", "New room has been create : "+nameRoom, rooms[i]);
              }
              socket.emit('updaterooms', rooms, socket.userRoom);
            }
          });
        }
    });

    socket.on('verifRoom', function(room, callback){
      var ok = false;
      for (var i = 0; i < rooms.length; i++) {
        if(rooms[i] == room){
          ok = true;
        }
      }
      if(ok){
        callback(true);
      }
      else{
        callback(false);
      }
    })

    socket.on('adduser', function(user, callback){
      // store the username in the socket session for this client
      var ok = true;
      for(var i = 0; i < users.length; i++){
        if(users[i].username == user.username){
          ok = false;
        }
      }
      if(ok){
        socket.username = user.username;
        callback(true);
      }
      else{
        callback(false);
      }
    });
  })
});
// var users = [];
// var messages = [];
// var typingUsers = [];
// io.on('connection', function(socket){
//   console.log('a user connected');
//   var loggedUser;
//   socket.emit('updaterooms', rooms, 'room1');
//   for (i = 0; i < messages.length; i++) {
//     if (messages[i].username !== undefined) {
//       socket.emit('chat-message', messages[i]);
//     } else {
//       socket.emit('service-message', messages[i]);
//     }
//   }
//   socket.on('user-login', function (user, callback) {
//     // Vérification que l'utilisateur n'existe pas
//     var userIndex = -1;
//     for (i = 0; i < users.length; i++) {
//       if (users[i].username === user.username) {
//         userIndex = i;
//       }
//     }
//     if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
//       // Sauvegarde de l'utilisateur et ajout à la liste des connectés
//       loggedUser = user;
//       users.push(loggedUser);
//       // Envoi des messages de service
//       var userServiceMessage = {
//         text: 'You logged in as "' + loggedUser.username + '"',
//         type: 'login'
//       };
//       var broadcastedServiceMessage = {
//         text: 'User "' + loggedUser.username + '" logged in',
//         type: 'login'
//       };
//       // Emission de 'user-login' et appel du callback
//       io.emit('user-login', loggedUser);
//       socket.emit('service-message', userServiceMessage);
//       socket.broadcast.emit('service-message', broadcastedServiceMessage);
//       messages.push(broadcastedServiceMessage);
//       callback(true);
//     } else {
//       callback(false);
//     }
//   });
//   for (i = 0; i < users.length; i++) {
//     socket.emit('user-login', users[i]);
//   }

//   socket.on('chat-message', function (message) {
//     message.username = loggedUser.username;
//     io.emit('chat-message', message);
//     messages.push(message);
//     if (messages.length > 150) {
//       messages.splice(0, 1);
//     }
//   });
//   socket.on('show-users', function(message){
//     var tex = "<ul>";
//     for (i = 0; i < users.length; i++) {
//       tex += "<li>"+users[i].username+"</li>"
//     }
//     tex += "</ul>";
//     var msg = tex;
//     socket.emit('Commande', msg);
//   });
//   socket.on('change-name', function(name){
//     if (loggedUser !== undefined) {
//       older_name = loggedUser.username;
//       io.emit('user-logout', loggedUser);
//       var userIndex = users.indexOf(loggedUser);
//       users[userIndex].username = name;
//       loggedUser.username = name;
//       io.emit('user-login', loggedUser);
//       var msg = 'The name of "'+ older_name +'" has been changed in "' + loggedUser.username + '"';
//       io.emit('Commande', msg);
//     }
//   });
//   socket.on('start-typing', function () {
//     // Ajout du user à la liste des utilisateurs en cours de saisie
//     if (typingUsers.indexOf(loggedUser) === -1) {
//       typingUsers.push(loggedUser);
//     }
//     io.emit('update-typing', typingUsers);
//   });
//   socket.on('stop-typing', function () {
//     var typingUserIndex = typingUsers.indexOf(loggedUser);
//     if (typingUserIndex !== -1) {
//       typingUsers.splice(typingUserIndex, 1);
//     }
//     io.emit('update-typing', typingUsers);
//   });

//   socket.on('disconnect', function () {
//     if (loggedUser !== undefined) {
//       // Broadcast d'un 'service-message'
//       var serviceMessage = {
//         text: 'User "' + loggedUser.username + '" disconnected',
//         type: 'logout'
//       };
//       socket.broadcast.emit('service-message', serviceMessage);
//       var typingUserIndex = typingUsers.indexOf(loggedUser);
//       if (typingUserIndex !== -1) {
//         typingUsers.splice(typingUserIndex, 1);
//       }
//       // Suppression de la liste des connectés
//       var userIndex = users.indexOf(loggedUser);
//       if (userIndex !== -1) {
//         users.splice(userIndex, 1);
//       }
//       // Ajout du message à l'historique
//       messages.push(serviceMessage);
//       // Emission d'un 'user-logout' contenant le user
//       io.emit('user-logout', loggedUser);
//     }
//   });
// });
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
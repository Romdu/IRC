var express = require('express');
var router = express.Router();
var User = require('../models/user');

// var mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/testForAuth');
// var db = mongoose.connection;

// //handle mongo error
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function () {
//   // we're connected!
// });

// GET route for reading data
router.get('/', function (req, res, next) {
  return res.sendFile('/home/romain/Documents/Javascript_avance_My_IRC/views/login.html');
});

router.get('/register', function (req, res, next) {
  return res.sendFile('/home/romain/Documents/Javascript_avance_My_IRC/views/register.html');
});

router.get('/acceuil', function (req, res, next) {
  User.findById(req.session.userId).exec(function (error, user) {
    if (error) {
      return next(error);
    }
    else {
      if (user === null) {
        return res.redirect('/');
      }
      else {
        return res.sendFile('/home/romain/Documents/Javascript_avance_My_IRC/views/acceuil.html');
      }
    }
  });
});

router.get('/chat/:id', function (req, res, next) {
  User.findById(req.session.userId).exec(function (error, user) {
    if (error) {
      return next(error);
    }
    else {
      if (user === null) {
        return res.redirect('/');
      }
      else {
        return res.sendFile('/home/romain/Documents/Javascript_avance_My_IRC/views/chat.html');
      }
    }
  });
});

//POST route for updating data
router.post('/', function (req, res, next) {
  // confirm that user typed same password twice
  if (req.body.logemail && req.body.logpassword) {
    User.authenticate(req.body.logemail, req.body.logpassword, function (error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/acceuil');
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
})

router.post('/register', function (req, res, next) {
  // confirm that user typed same password twice
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error('Passwords do not match.');
    err.status = 400;
    res.send("passwords dont match");
    return next(err);
  }
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf,
    }

    User.create(userData, function (error, user) {
      if (error) {
        return next(error);
      } else {
        req.session.userId = user._id;
        return res.redirect('/acceuil');
      }
    });

  }else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
})

// GET route after registering
router.get('/profile', function (req, res, next) {
  User.findById(req.session.userId)
    .exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          var err = new Error('Not authorized! Go back!');
          err.status = 400;
          return next(err);
        } else {
          return res.send('<h1>Name: </h1>' + user.username + '<h2>Mail: </h2>' + user.email + '<br><a type="button" href="/logout">Logout</a>')
        }
      }
    });
});

// GET for logout logout
router.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

module.exports = router;
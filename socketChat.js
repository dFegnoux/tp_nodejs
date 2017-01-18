var express = require('express'),
    session = require('cookie-session'), // Session middleware
    bodyParser = require('body-parser'), // Parameters middleware
    ent = require('ent'), // Escape unsafe characters middleware
    _und = require('underscore'), // Parameters middleware
    urlencodedParser = bodyParser.urlencoded({ extended: false }),

    app = express(),
    server = require('http').Server(app),

    initSession = function(req, res, next) {
        if(typeof(req.session.chatroom) === 'undefined') {
            req.session.chatroom = [];
        }
        next();
    };


app.use(session({secret: 'chatroom'}))
.use(initSession)

// common route, display chatroom
.get('/', function(req, res) { 
    res.render('chatroom.ejs', {chatroom: req.session.chatroom});
})

// Default behavior route, redirect to common
.use(function(req, res, next){
    res.redirect('/');
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

var typingUsers = [];

io.sockets.on('connection', function (socket, pseudo) {
    // Connection feedback to client
    socket.emit('message', 'Vous êtes bien connecté !');

    // On signale aux autres clients qu'il y a un nouveau venu
    socket.on('new_connection', function(pseudo) {
        socket.pseudo = pseudo;
        console.log(pseudo + ' is connected');
        socket.broadcast.emit('chatroom-information', '<b>'+pseudo+'</b> vient de se connecter ! ');
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('user-message', function (content) {
        console.log(content.username + ': ' + content.message);
        content.message = ent.encode(content.message);
        socket.broadcast.emit('user-message', content);
    }); 

    // Listen if user is typing then broadcast it
    socket.on('user-is-typing', function() {
        console.log(_und.indexOf(typingUsers, socket.pseudo));
        console.log(socket.pseudo);
        if(_und.indexOf(typingUsers, socket.pseudo) === -1) {
            typingUsers.push(socket.pseudo);
            console.log('typing-users : ' + typingUsers.join(', '));
            if(typingUsers.length) {
                var singplural = typingUsers.length > 1 ? 'are' : 'is';
                socket.broadcast.emit('user-is-typing', typingUsers.join(', ') +' '+ singplural + ' typing something...');
            }
        }
    });

    socket.on('user-has-stop-typing', function() {
        var indexOfUser = _und.indexOf(typingUsers, socket.pseudo);
        if(indexOfUser > -1) {
            typingUsers.splice(indexOfUser, 1);
        }
        console.log('typing-users : ' + typingUsers.join(', '));
    });
});

server.listen(8080);
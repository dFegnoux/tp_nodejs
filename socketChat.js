var express = require('express'),
    session = require('cookie-session'), // Session middleware
    bodyParser = require('body-parser'), // Parameters middleware
    ent = require('ent'), // Escape unsafe characters middleware
    _und = require('underscore'), // Parameters middleware
    urlencodedParser = bodyParser.urlencoded({ extended: false }),
    onlineUsers = [],
    typingUsers = [],

    app = express(),
    server = require('http').Server(app),

    initSession = function(req, res, next) {
        if(typeof(req.session.chatroom) === 'undefined') {
            req.session.chatroom = [];
        }
        next();
    };

    updateUserTyping = function(socket) {
        var baseMessage = '';
        if(typingUsers.length) {
            var singplural = typingUsers.length > 1 ? 'are' : 'is';
            baseMessage = typingUsers.join(', ') +' '+ singplural + ' typing something...';
        }
        socket.broadcast.emit('user-is-typing', baseMessage);
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

io.sockets.on('connection', function (socket, pseudo) {
    // Connection feedback to client
    socket.emit('message', 'Vous êtes bien connecté !');

    // On signale aux autres clients qu'il y a un nouveau venu
    socket.on('new_connection', function(pseudo) {
        socket.pseudo = pseudo;
        onlineUsers.push(pseudo);
        console.log(pseudo + ' is now connected');
        socket.broadcast.emit('chatroom-information', '<b>'+pseudo+'</b> vient de se connecter ! ');
        socket.broadcast.emit('online-users-update', onlineUsers);
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('user-message', function (content) {
        console.log(content.username + ': ' + content.message);
        content.message = ent.encode(content.message);
        socket.broadcast.emit('user-message', content);
    }); 

    // Listen if user is typing then broadcast it
    socket.on('user-is-typing', function() {
        console.log('*Start function* Typing users right now : ', typingUsers);
        if(_und.indexOf(typingUsers, socket.pseudo) === -1) {
            console.log(socket.pseudo+' starts writing');
            typingUsers.push(socket.pseudo);
            updateUserTyping(socket);
        }
        console.log('*End function* Typing users right now : ', typingUsers);
    });

    socket.on('user-has-stop-typing', function() {
        console.log(socket.pseudo+' has stop typing');
        var indexOfUser = _und.indexOf(typingUsers, socket.pseudo);
        if(indexOfUser > -1) {
            typingUsers.splice(indexOfUser, 1);
        }
        console.log('typing-users : ' + typingUsers.join(', '));
        updateUserTyping(socket);
    });
});

server.listen(8080);
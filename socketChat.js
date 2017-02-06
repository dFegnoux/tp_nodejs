var express = require('express'),
    session = require('cookie-session'), // Session middleware
    bodyParser = require('body-parser'), // Parameters middleware
    ent = require('ent'), // Escape unsafe characters middleware
    _und = require('underscore'), // Parameters middleware
    urlencodedParser = bodyParser.urlencoded({ extended: false }),
    onlineUsers = [],
    typingUsers = [],
    lastMessages = [],

    app = express(),
    server = require('http').Server(app),

    initSession = function(req, res, next) {
        if(typeof(req.session.chatroom) === 'undefined') {
            req.session.chatroom = [];
        }
        next();
    },

    updateUserTyping = function(socket) {
        var baseMessage = '';
        if(typingUsers.length) {
            var singplural = typingUsers.length > 1 ? 'are' : 'is';
            baseMessage = typingUsers.join(', ') +' '+ singplural + ' typing something...';
        }
        socket.broadcast.emit('user-is-typing', baseMessage);
    },

    updateLastMessages = function(message) {
        var messageslimit = 5; 
        lastMessages.push(message);
        if(lastMessages.length > messageslimit) {
            lastMessages.slice(messageslimit);
        }
    };

app.use("/public", express.static(__dirname + "/public"));

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

    socket.on('disconnect',function(){
        onlineUsers = _und.reject(onlineUsers, function(username){
            if(username === socket.pseudo) {
                console.log(socket.pseudo +' has disconnected');
                socket.broadcast.emit('chatroom-information', '<b>'+socket.pseudo+'</b> vient de se déconnecter ! ');
                return true;
            }
        });
        socket.broadcast.emit('online-users-update', onlineUsers);
    });

    // On signale aux autres clients qu'il y a un nouveau venu
    socket.on('new_connection', function(pseudo) {
        socket.pseudo = pseudo;

        if(onlineUsers.indexOf(pseudo) === -1) {
            onlineUsers.push(pseudo);
            console.log(pseudo + ' is now connected');
            socket.broadcast.emit('chatroom-information', '<b>'+pseudo+'</b> vient de se connecter ! ');
            io.sockets.emit('online-users-update', onlineUsers);
            socket.emit('get-last-messages', lastMessages);
        } else {
            socket.emit('not-valid-nickname');
        }
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('user-message', function (content) {
        console.log(content.username + ': ' + content.message);
        content.message = ent.encode(content.message);
        io.sockets.emit('user-message', content);
        updateLastMessages(content);
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
var express = require('express'),
    session = require('cookie-session'), // Session middleware
    bodyParser = require('body-parser'), // Parameters middleware
    ent = require('ent'), // Escape unsafe characters middleware
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

io.sockets.on('connection', function (socket, pseudo) {
    // Connection feedback to client
    socket.emit('message', 'Vous êtes bien connecté !');

    // On signale aux autres clients qu'il y a un nouveau venu
    socket.on('new_connection', function(pseudo) {
        console.log(pseudo + ' is connected');
        socket.broadcast.emit('chatroom-information', '<b>'+pseudo+'</b> vient de se connecter ! ');
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('user-message', function (content) {
        console.log(content.username + ': ' + content.message);
        content.message = ent.encode(content.message);
        socket.broadcast.emit('user-message', content);
    }); 
});

server.listen(8080);
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

    formatMessage = function(message) {
        message.content = message.content.replace(/@([a-zA-Z]*)/g, '<span class="username">$&</span>');
        return message;
    };

    addMessageAndUpdate = function(io, message) {
        var messageslimit = 5;
        var formatedMessage = formatMessage(message);
        lastMessages.push(formatedMessage);
        if(lastMessages.length > messageslimit) {
            lastMessages.slice(messageslimit);
        }
        io.sockets.emit('new-message', formatedMessage);
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

io.sockets.on('connection', function (socket, nickname) {
    // Connection feedback to client
    socket.emit('message', 'Vous êtes bien connecté !');

    // Disconnect user and remove him from online users list
    socket.on('disconnect',function(){
        onlineUsers = _und.reject(onlineUsers, function(username){
            if(username === socket.nickname) {
                console.log(socket.nickname +' has disconnected');
                addMessageAndUpdate(io, {
                    type: 'info',
                    author: 'server',
                    content: '<span class="username">'+socket.nickname+'</span> has just disconnected !',
                });
                return true;
            }
        });
        socket.broadcast.emit('online-users-update', onlineUsers);
    });

    // Allow or not user to connect by is nickname validity then notify his connection to the others
    socket.on('new_connection', function(nickname) {
        if(onlineUsers.indexOf(nickname) === -1) {
            socket.nickname = nickname;
            onlineUsers.push(socket.nickname);
            console.log(socket.nickname + ' is now connected');
            socket.emit('get-last-messages', lastMessages);
            addMessageAndUpdate(io, {
                type: 'info',
                author: 'server',
                content: '<span class="username">'+socket.nickname+'</span> has join the chat !',
            });
            socket.emit('confirm-connection', socket.nickname);
            io.sockets.emit('online-users-update', onlineUsers);
        } else {
            socket.emit('not-valid-nickname');
        }
    });

    // Allow or not user to change his nickname
    socket.on('change-nickname', function(newNickname) {
        if(onlineUsers.indexOf(nickname) === -1) {
            var index = onlineUsers.indexOf(socket.nickname);
            if(index !== -1) {
                onlineUsers.splice(index, 1 , newNickname);
            } else {
                onlineUsers.push(newNickname);
            }
            console.log(socket.nickname + ' is now ' +newNickname);
            addMessageAndUpdate(io, {
                type: 'info',
                author: 'server',
                content: '<span class="username">'+socket.nickname+'</span> is now <span class="username">'+newNickname+'</span> !',
            });
            socket.nickname = newNickname;
            socket.emit('confirm-changed-nickname', socket.nickname);
            io.sockets.emit('online-users-update', onlineUsers);
        } else {
            socket.emit('not-valid-nickname');
        }
    });

    // As soon server receives a message, send it to other users and update last messages list
    socket.on('user-message', function (content) {
        console.log(socket.nickname + ': ' + content);
        addMessageAndUpdate(io, {
            type: 'user-message',
            author: socket.nickname,
            content: ent.encode(content),
        });
    }); 

    // Listen if user is typing then broadcast it
    socket.on('user-is-typing', function() {
        console.log('*Start function* Typing users right now : ', typingUsers);
        if(_und.indexOf(typingUsers, socket.nickname) === -1) {
            console.log(socket.nickname+' starts writing');
            typingUsers.push(socket.nickname);
            updateUserTyping(socket);
        }
        console.log('*End function* Typing users right now : ', typingUsers);
    });

    // Remove user from writers list when it stops
    socket.on('user-has-stop-typing', function() {
        console.log(socket.nickname+' has stop typing');
        var indexOfUser = _und.indexOf(typingUsers, socket.nickname);
        if(indexOfUser > -1) {
            typingUsers.splice(indexOfUser, 1);
        }
        console.log('typing-users : ' + typingUsers.join(', '));
        updateUserTyping(socket);
    });
});

server.listen(8080);
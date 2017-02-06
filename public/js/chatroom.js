var socket = io.connect('http://localhost:8080'),
    $chatContainer = $('.chat-container'),
    $messageInput = $('#newMessage'),
    $isTypingField = $('.is-typing'),
    $userList = $('.user-list'),
    nickname = null,
    getUserMessage = function(message) {
        return '<div class="user-message"><span class="username">'+message.author+'</span> : '+message.content+'</div>';
    },
    getInfoMessage = function(message) {
        return '<div class="chatroom-information"><i>'+message.content+'</i></div>';
    },
    connectToChat = function(chooseNicknameText) {
        var newNickname = prompt(chooseNicknameText);
        if(typeof(newNickname) === 'string' && newNickname.length) {
            socket.emit('new_connection', newNickname);
        } else if (newNickname === null) {
            socket.disconnect();
        } else {
            connectToChat("Huh... Let say that you haven't understand... pretty please choose a nickname");
        }
    },
    addMessage = function(message) {
        if(message.type == 'user-message') {
            $chatContainer.append(getUserMessage(message));
        } else if (message.type == 'info') {
            $chatContainer.append(getInfoMessage(message));
        }
        $chatContainer[0].scrollTop = $chatContainer[0].scrollHeight;
    };

//Try to connect user to chat by choosing a nickname
connectToChat('Please choose a nickname');

//Set nickname only if server has confirmed
socket.on('confirm-connection', function(confirmedNickname) {
    nickname = confirmedNickname;
});

// If nickname is not valid ask another nickname
socket.on('not-valid-nickname', function() {
    connectToChat('It seems your nickname is already taken, try another one ?');
});

// Display received message from another user
socket.on('new-message', addMessage);

$messageInput.on('focus', function(e) {
    $messageInput.data('oldvalue', $messageInput.val());
});

$messageInput.on('blur', function(e) {
    // socket.emit('user-has-stop-typing', nickname);
});

// Watch when user is typing and then emit to server
$messageInput.on('input', function(e) {
    if($messageInput.val() && $messageInput.val() !== $messageInput.data('oldvalue')) {
        $messageInput.data('oldvalue', $messageInput.val());
        socket.emit('user-is-typing');
    } else {
        socket.emit('user-has-stop-typing');
    }
});

// Display a message if someone is typing
socket.on('user-is-typing', function(message) {
    $isTypingField.text(message);
});

// Update online user list when it changes and mark current user
socket.on('online-users-update', function(onlineUsers) {
    var list = '';
    onlineUsers.forEach(function(userName) {
        var isMeClass = userName === nickname ? ' is-me' : '';
        list += '<div class="user-list-item'+isMeClass+'">'+userName+'</div>';
    });
    $userList.html(list);
});

// Send message to server and add it to local chatbox
$('form').on('submit', function(e) {
    e.preventDefault();
 
    // Server emition
    socket.emit('user-message', $messageInput.val());

    // Clean form
    $messageInput.val("");

    // Assume that user isn't typing anymore
    socket.emit('user-has-stop-typing');
});

// Get last n messages
socket.on('get-last-messages', function(lastMessages) {
    var messagesOutput = '';
    lastMessages.forEach(function(message) {
        addMessage(message);
    });
});
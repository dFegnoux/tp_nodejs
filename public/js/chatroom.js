var socket = io.connect('http://localhost:8080'),
    $chatContainer = $('.chat-container'),
    $messageInput = $('#newMessage'),
    $isTypingField = $('.is-typing'),
    $userList = $('.user-list'),
    pseudo = prompt('Quel est votre pseudo ?'),
    addMessage = function(message) {
        $chatContainer.append('<div class="user-message"><span class="username">'+message.username+'</span> : '+message.message+'</div>');
        $chatContainer[0].scrollTop = $chatContainer[0].scrollHeight;
    };

// Notify new user to server
socket.emit('new_connection', pseudo);

// Handle messages from server
socket.on('chatroom-information', function(message) {
    $('.chat-container').append('<div class="chatroom-information"><i>'+message+'</i></div>');
})

// Display received message from another user
socket.on('user-message', addMessage);

$messageInput.on('focus', function(e) {
    $messageInput.data('oldvalue', $messageInput.val());
});

$messageInput.on('blur', function(e) {
    // socket.emit('user-has-stop-typing', pseudo);
});

// Watch when user is typing and then emit to server
$messageInput.on('input', function(e) {
    if($messageInput.val() && $messageInput.val() !== $messageInput.data('oldvalue')) {
        $messageInput.data('oldvalue', $messageInput.val());
        socket.emit('user-is-typing', pseudo);
    } else {
        socket.emit('user-has-stop-typing', pseudo);
    }
});

// Display a message if someone is typing
socket.on('user-is-typing', function(message) {
    $isTypingField.text(message);
});

// Update online user list when it changes
socket.on('online-users-update', function(onlineUsers) {
    var list = '';
    onlineUsers.forEach(function(userName) {
        list += '<div class="user-list-item">'+userName+'</div>';
    });
    $userList.html(list);
});

// Send message to server and add it to local chatbox
$('form').on('submit', function(e) {
    e.preventDefault();
    var message = {
        username: pseudo,
        message: $messageInput.val()
    }

    // Server emition
    socket.emit('user-message', message);

    // Local
    addMessage({
        username: pseudo,
        message: $messageInput.val()
    });

    // Clean form
    $messageInput.val("");
});
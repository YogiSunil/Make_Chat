const socket = io();

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');

// Send message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
});

// Receive messages
socket.on('chat message', (msg) => {
    const messageElement = document.createElement('li');
    messageElement.textContent = msg;
    messages.appendChild(messageElement);
    
    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;
});

// Handle connection events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
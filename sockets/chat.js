// Chat socket handlers
const chatHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Handle chat messages
        socket.on('chat message', (msg) => {
            console.log('Message received:', msg);
            // Broadcast message to all connected clients
            io.emit('chat message', {
                id: socket.id,
                message: msg,
                timestamp: new Date().toLocaleTimeString()
            });
        });

        // Handle user joining
        socket.on('user joined', (username) => {
            socket.username = username;
            socket.broadcast.emit('user joined', {
                username: username,
                message: `${username} joined the chat`
            });
        });

        // Handle user leaving
        socket.on('user left', (username) => {
            socket.broadcast.emit('user left', {
                username: username,
                message: `${username} left the chat`
            });
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.broadcast.emit('typing', {
                username: data.username,
                isTyping: data.isTyping
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            if (socket.username) {
                socket.broadcast.emit('user left', {
                    username: socket.username,
                    message: `${socket.username} left the chat`
                });
            }
        });
    });
};

module.exports = chatHandlers;
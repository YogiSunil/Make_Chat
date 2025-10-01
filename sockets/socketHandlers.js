// Socket event handlers
const socketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Handle joining a room
        socket.on('join room', (room) => {
            socket.join(room);
            socket.emit('message', `You joined room: ${room}`);
            socket.to(room).emit('message', `User ${socket.id} joined the room`);
        });

        // Handle leaving a room
        socket.on('leave room', (room) => {
            socket.leave(room);
            socket.to(room).emit('message', `User ${socket.id} left the room`);
        });

        // Handle private messages
        socket.on('private message', ({ to, message }) => {
            socket.to(to).emit('private message', {
                from: socket.id,
                message: message
            });
        });

        // Handle typing indicators
        socket.on('typing', (room) => {
            socket.to(room).emit('typing', socket.id);
        });

        socket.on('stop typing', (room) => {
            socket.to(room).emit('stop typing', socket.id);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

module.exports = socketHandlers;
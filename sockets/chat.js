//chat.js
//Make sure to add channels and privateMessages to module.exports parameters
module.exports = (io, socket, onlineUsers, channels, privateMessages) => {

  socket.on('new user', (username) => {
    //Save the username as key to access the user's socket id
    onlineUsers[username] = socket.id;
    //Save the username to socket as well. This is important for later.
    socket["username"] = username;
    console.log(`✋ ${username} has joined the chat! ✋`);
    io.emit("new user", username);
  })

  socket.on('new message', (data) => {
    //Save the new message to the channel.
    channels[data.channel].push({sender : data.sender, message : data.message});
    //Emit only to sockets that are in that channel room.
    io.to(data.channel).emit('new message', data);
  })

  socket.on('get online users', () => {
    //Send over the onlineUsers
    socket.emit('get online users', onlineUsers);
  })

  socket.on('get channels', () => {
    //Send over the channels
    socket.emit('get channels', channels);
  })

  socket.on('new channel', (newChannel) => {
    //Save the new channel to our channels object. The array will hold the messages.
    channels[newChannel] = [];
    //Have the socket join the new channel room.
    socket.join(newChannel);
    //Inform all clients of the new channel.
    io.emit('new channel', newChannel);
    //Emit to the client that made the new channel, to change their channel to the one they made.
    socket.emit('user changed channel', {
      channel : newChannel,
      messages : channels[newChannel]
    });
  });

  //Have the socket join the room of the channel
  socket.on('user changed channel', (newChannel) => {
    socket.join(newChannel);
    socket.emit('user changed channel', {
      channel : newChannel,
      messages : channels[newChannel]
    });
  });

  // Handle private messages
  socket.on('private message', (data) => {
    let privateKey = [data.sender, data.recipient].sort().join('-');
    
    // Initialize private message array if it doesn't exist
    if(!privateMessages[privateKey]) {
      privateMessages[privateKey] = [];
    }
    
    // Save the private message
    privateMessages[privateKey].push({
      sender: data.sender,
      message: data.message,
      timestamp: new Date()
    });
    
    // Send message to recipient if they're online
    let recipientSocketId = onlineUsers[data.recipient];
    if(recipientSocketId) {
      io.to(recipientSocketId).emit('private message', {
        sender: data.sender,
        message: data.message
      });
    }
    
    console.log(`💬 Private message from ${data.sender} to ${data.recipient}: ${data.message}`);
  });

  // Handle private message history requests
  socket.on('get private messages', (otherUser) => {
    let privateKey = [socket.username, otherUser].sort().join('-');
    let messages = privateMessages[privateKey] || [];
    
    socket.emit('private message history', {
      otherUser: otherUser,
      messages: messages
    });
  });

  // This fires when a user closes out of the application
  // socket.on("disconnect") is a special listener that fires when a user exits out of the application.
  socket.on('disconnect', () => {
    //This deletes the user by using the username we saved to the socket
    delete onlineUsers[socket.username]
    io.emit('user has left', onlineUsers);
  });

}
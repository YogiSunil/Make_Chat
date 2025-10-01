//chat.js
//Make sure to add channels, privateMessages, and channelMemberships to module.exports parameters
module.exports = (io, socket, onlineUsers, channels, privateMessages, channelMemberships) => {

  socket.on('new user', (username) => {
    //Save the username as key to access the user's socket id
    onlineUsers[username] = socket.id;
    //Save the username to socket as well. This is important for later.
    socket["username"] = username;
    console.log(`✋ ${username} has joined the chat! ✋`);
    io.emit("new user", username);
  })

  socket.on('new message', (data) => {
    // Check if user has access to this channel
    if (!hasChannelAccess(socket.username, data.channel, channels)) {
      socket.emit('error', { message: 'You do not have access to this channel' });
      return;
    }
    
    //Save the new message to the channel.
    channels[data.channel].messages.push({sender : data.sender, message : data.message});
    //Emit only to sockets that are in that channel room.
    io.to(data.channel).emit('new message', data);
  })

  socket.on('get online users', () => {
    //Send over the onlineUsers
    socket.emit('get online users', onlineUsers);
  })

  socket.on('get channels', () => {
    //Send over only the channels the user has access to
    let userChannels = {};
    for (let channelName in channels) {
      if (hasChannelAccess(socket.username, channelName, channels)) {
        userChannels[channelName] = {
          messages: channels[channelName].messages,
          members: channels[channelName].members,
          creator: channels[channelName].creator,
          isPublic: channels[channelName].isPublic
        };
      }
    }
    socket.emit('get channels', userChannels);
  })

  socket.on('new channel', (data) => {
    let channelName = data.channelName;
    let invitedMembers = data.members || [];
    
    // Determine if channel should be public or private
    let isPublicChannel = invitedMembers.length === 0; // Public if no specific members invited
    
    // Create the new channel
    channels[channelName] = {
      messages: [],
      members: isPublicChannel ? [] : [socket.username, ...invitedMembers], // Empty for public, specific for private
      creator: socket.username,
      isPublic: isPublicChannel
    };
    
    // Have the creator join the new channel room
    socket.join(channelName);
    
    if (isPublicChannel) {
      // For public channels, notify ALL connected users
      io.emit('new channel', {
        name: channelName,
        creator: socket.username,
        members: channels[channelName].members,
        isPublic: true
      });
    } else {
      // For private channels, send invitations to specific members
      invitedMembers.forEach(member => {
        if (onlineUsers[member]) {
          io.to(onlineUsers[member]).emit('channel invitation', {
            channel: channelName,
            invitedBy: socket.username
          });
        }
      });
      
      // Notify only the members who have access to this private channel
      channels[channelName].members.forEach(member => {
        if (onlineUsers[member]) {
          io.to(onlineUsers[member]).emit('new channel', {
            name: channelName,
            creator: socket.username,
            members: channels[channelName].members,
            isPublic: false
          });
        }
      });
    }
    
    // Emit to the client that made the new channel, to change their channel to the one they made
    socket.emit('user changed channel', {
      channel: channelName,
      messages: channels[channelName].messages
    });
  });

  //Have the socket join the room of the channel
  socket.on('user changed channel', (newChannel) => {
    // Check if user has access to this channel
    if (!hasChannelAccess(socket.username, newChannel, channels)) {
      socket.emit('error', { message: 'You do not have access to this channel' });
      return;
    }
    
    socket.join(newChannel);
    socket.emit('user changed channel', {
      channel : newChannel,
      messages : channels[newChannel].messages
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
    
    // Also send confirmation back to sender (but they won't display it since we filter it out)
    socket.emit('private message', {
      sender: data.sender,
      message: data.message,
      recipient: data.recipient
    });
    
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

  // Handle channel invitations
  socket.on('accept channel invitation', (channelName) => {
    if (channels[channelName] && channels[channelName].members.includes(socket.username)) {
      socket.join(channelName);
      socket.emit('user changed channel', {
        channel: channelName,
        messages: channels[channelName].messages
      });
      
      // Notify other channel members
      socket.to(channelName).emit('user joined channel', {
        channel: channelName,
        username: socket.username
      });
    }
  });

  // Get channel members (for channel creators to manage)
  socket.on('get channel members', (channelName) => {
    if (channels[channelName] && channels[channelName].creator === socket.username) {
      socket.emit('channel members', {
        channel: channelName,
        members: channels[channelName].members,
        creator: channels[channelName].creator
      });
    }
  });

  // Add members to existing channel (only creator can do this)
  socket.on('add channel members', (data) => {
    let { channelName, newMembers } = data;
    
    if (channels[channelName] && channels[channelName].creator === socket.username) {
      // Add new members to the channel
      newMembers.forEach(member => {
        if (!channels[channelName].members.includes(member)) {
          channels[channelName].members.push(member);
          
          // Notify the new member if they're online
          if (onlineUsers[member]) {
            io.to(onlineUsers[member]).emit('channel invitation', {
              channel: channelName,
              invitedBy: socket.username
            });
            
            // Also send them the new channel
            io.to(onlineUsers[member]).emit('new channel', {
              name: channelName,
              creator: channels[channelName].creator,
              members: channels[channelName].members
            });
          }
        }
      });
    }
  });

  // This fires when a user closes out of the application
  // socket.on("disconnect") is a special listener that fires when a user exits out of the application.
  socket.on('disconnect', () => {
    //This deletes the user by using the username we saved to the socket
    delete onlineUsers[socket.username]
    io.emit('user has left', onlineUsers);
  });

}

// Helper function to check if user has access to a channel
function hasChannelAccess(username, channelName, channels) {
  if (!channels[channelName]) return false;
  
  // General channel is always accessible
  if (channelName === 'General') return true;
  
  // Public channels are accessible to everyone
  if (channels[channelName].isPublic) return true;
  
  // Private channels require membership
  return channels[channelName].members.includes(username);
}
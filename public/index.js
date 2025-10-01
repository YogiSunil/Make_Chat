//index.js
$(document).ready(() => {

  const socket = io.connect();
  let currentUser;
  socket.emit('get online users');
  // Get the existing channels from the server
  socket.emit('get channels');
  //Each user should be in the general channel by default.
  socket.emit('user changed channel', "General");

  //Users can change the channel by clicking on its name.
  $(document).on('click', '.channel', (e)=>{
    let newChannel = e.target.textContent;
    socket.emit('user changed channel', newChannel);
    // Clear private chat selection
    $('.private-chat-active').removeClass('private-chat-active');
    $('.channel-current').removeClass('private-message-indicator');
  });

  //Users can start private chats by clicking on usernames
  $(document).on('click', '.user-online', (e)=>{
    let targetUser = e.target.textContent;
    if(targetUser !== currentUser) {
      startPrivateChat(targetUser);
    }
  });

  //Users can switch between private chats
  $(document).on('click', '.private-chat', (e)=>{
    let targetUser = e.target.textContent.replace(' (Private)', '');
    switchToPrivateChat(targetUser);
  });

  $('#create-user-btn').click((e)=>{
    e.preventDefault();
    if($('#username-input').val().length > 0){
      socket.emit('new user', $('#username-input').val());
      // Save the current user when created
      currentUser = $('#username-input').val();
      $('.username-form').remove();
      // Have the main page visible
      $('.main-container').css('display', 'flex');
    }
  });

  $('#send-chat-btn').click((e) => {
    e.preventDefault();
    let message = $('#chat-input').val();
    if(message.length > 0) {
      // Check if we're in a private chat
      let activePrivateChat = $('.private-chat-active').text().replace(' (Private)', '');
      if(activePrivateChat) {
        // Send private message
        socket.emit('private message', {
          sender: currentUser,
          recipient: activePrivateChat,
          message: message
        });
      } else {
        // Send channel message
        let channel = $('.channel-current').text();
        socket.emit('new message', {
          sender : currentUser,
          message : message,
          channel : channel
        });
      }
      $('#chat-input').val("");
    }
  });

  // Helper functions for private messaging
  function startPrivateChat(targetUser) {
    // Check if private chat already exists
    if($(`.private-chat:contains('${targetUser}')`).length === 0) {
      $('.private-chats-list').append(`<div class="private-chat">${targetUser} (Private)</div>`);
    }
    switchToPrivateChat(targetUser);
  }

  function switchToPrivateChat(targetUser) {
    // Clear channel selection
    $('.channel-current').addClass('channel').removeClass('channel-current');
    
    // Set private chat as active
    $('.private-chat-active').removeClass('private-chat-active');
    $(`.private-chat:contains('${targetUser}')`).addClass('private-chat-active');
    
    // Request private message history
    socket.emit('get private messages', targetUser);
    
    // Update UI to show private chat
    $('.message-container h2').text(`Private Chat with ${targetUser}`);
  }

  // Logout functionality
  $('#logout-btn').click((e) => {
    e.preventDefault();
    // Disconnect from socket
    socket.disconnect();
    // Reset the interface
    $('.main-container').css('display', 'none');
    $('.users-online').empty();
    $('.message-container').empty().append('<h2>Messages</h2>');
    currentUser = null;
    // Show the username form again
    $('body').prepend(`
      <form class="username-form">
        <input id="username-input" placeholder="Username"></input>
        <button id="create-user-btn">Join Chat</button>
      </form>
    `);
    // Reload the page to reset everything properly
    location.reload();
  });

  $('#new-channel-btn').click( () => {
    let newChannel = $('#new-channel-input').val();

    if(newChannel.length > 0){
      // Emit the new channel to the server
      socket.emit('new channel', newChannel);
      $('#new-channel-input').val("");
    }
  });

  //socket listeners
  socket.on('new user', (username) => {
    console.log(`${username} has joined the chat`);
    // Add the new user to the online users div
    $('.users-online').append(`<div class="user-online">${username}</div>`);
  })

  //Output the new message
  socket.on('new message', (data) => {
    //Only append the message if the user is currently in that channel
    let currentChannel = $('.channel-current').text();
    if(currentChannel == data.channel) {
      $('.message-container').append(`
        <div class="message">
          <p class="message-user">${data.sender}: </p>
          <p class="message-text">${data.message}</p>
        </div>
      `);
    }
  })

  socket.on('get online users', (onlineUsers) => {
    //You may have not have seen this for loop before. It's syntax is for(key in obj)
    //Our usernames are keys in the object of onlineUsers.
    for(username in onlineUsers){
      $('.users-online').append(`<div class="user-online">${username}</div>`);
    }
  })

  // Get existing channels and display them
  socket.on('get channels', (channels) => {
    // Clear existing channels first (except General)
    $('.channels .channel').remove();
    // Add all channels from server
    for(channelName in channels){
      if(channelName !== 'General') {
        $('.channels').append(`<div class="channel">${channelName}</div>`);
      }
    }
  })

  //Refresh the online user list
  socket.on('user has left', (onlineUsers) => {
    $('.users-online').empty();
    for(username in onlineUsers){
      $('.users-online').append(`<div class="user-online">${username}</div>`);
    }
  });

  // Add the new channel to the channels list (Fires for all clients)
  socket.on('new channel', (newChannel) => {
    $('.channels').append(`<div class="channel">${newChannel}</div>`);
  });

  // Make the channel joined the current channel. Then load the messages.
  // This only fires for the client who made the channel.
  socket.on('user changed channel', (data) => {
    $('.channel-current').addClass('channel');
    $('.channel-current').removeClass('channel-current');
    $(`.channel:contains('${data.channel}')`).addClass('channel-current');
    $('.channel-current').removeClass('channel');
    $('.message').remove();
    $('.message-container h2').text('Messages');
    data.messages.forEach((message) => {
      $('.message-container').append(`
        <div class="message">
          <p class="message-user">${message.sender}: </p>
          <p class="message-text">${message.message}</p>
        </div>
      `);
    });
  });

  // Handle incoming private messages
  socket.on('private message', (data) => {
    // Add private chat to list if it doesn't exist
    if($(`.private-chat:contains('${data.sender}')`).length === 0) {
      $('.private-chats-list').append(`<div class="private-chat">${data.sender} (Private)</div>`);
    }
    
    // If we're currently in this private chat, display the message
    let activePrivateChat = $('.private-chat-active').text().replace(' (Private)', '');
    if(activePrivateChat === data.sender) {
      $('.message-container').append(`
        <div class="message">
          <p class="message-user">${data.sender}: </p>
          <p class="message-text">${data.message}</p>
        </div>
      `);
    } else {
      // Add notification indicator
      $(`.private-chat:contains('${data.sender}')`).addClass('private-message-indicator');
    }
  });

  // Handle private message history
  socket.on('private message history', (data) => {
    $('.message').remove();
    $('.message-container h2').text(`Private Chat with ${data.otherUser}`);
    data.messages.forEach((message) => {
      $('.message-container').append(`
        <div class="message">
          <p class="message-user">${message.sender}: </p>
          <p class="message-text">${message.message}</p>
        </div>
      `);
    });
  });

})
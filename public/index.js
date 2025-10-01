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
    // Get the channel name from the first text node (before member count)
    let newChannel = $(e.target).contents().first().text().trim();
    if (!newChannel) {
      // Fallback to full text content and extract channel name
      let fullText = $(e.target).text();
      newChannel = fullText.replace(/\s*\(\d+\)\s*$/, '').trim();
    }
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
        
        // Show the message immediately in the sender's chat
        $('.message-container').append(`
          <div class="message">
            <p class="message-user">${currentUser}: </p>
            <p class="message-text">${message}</p>
          </div>
        `);
        
        // Scroll to bottom
        $('.message-container').scrollTop($('.message-container')[0].scrollHeight);
        
      } else {
        // Send channel message
        let channelElement = $('.channel-current');
        let channel = channelElement.contents().first().text().trim();
        if (!channel) {
          // Fallback to full text content and extract channel name
          let fullText = channelElement.text();
          channel = fullText.replace(/\s*\(\d+\)\s*$/, '').trim();
        }
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

  // Open channel creation modal instead of directly creating
  $('#new-channel-btn').click(() => {
    $('#channel-modal').show();
    loadAvailableUsers();
  });

  // Close modal handlers
  $('.close, #cancel-channel-btn').click(() => {
    $('#channel-modal').hide();
    clearChannelModal();
  });

  // Create channel with selected members
  $('#create-channel-btn').click(() => {
    let channelName = $('#modal-channel-name').val().trim();
    let selectedMembers = [];
    
    $('#selected-users-list .selectable-user').each(function() {
      selectedMembers.push($(this).data('username'));
    });

    if (channelName.length > 0) {
      socket.emit('new channel', {
        channelName: channelName,
        members: selectedMembers
      });
      $('#channel-modal').hide();
      clearChannelModal();
    }
  });

  // Handle user selection for channel creation
  $(document).on('click', '.selectable-user', function() {
    let username = $(this).data('username');
    let isInAvailable = $(this).closest('#available-users-list').length > 0;
    
    if (isInAvailable) {
      // Move from available to selected
      $(this).remove();
      $('#selected-users-list').append(`
        <div class="selectable-user" data-username="${username}">
          <span>${username}</span>
          <button class="remove-user">×</button>
        </div>
      `);
    }
  });

  // Handle user removal from selected list
  $(document).on('click', '.remove-user', function(e) {
    e.stopPropagation();
    let userDiv = $(this).closest('.selectable-user');
    let username = userDiv.data('username');
    
    userDiv.remove();
    
    // Add back to available list
    $('#available-users-list').append(`
      <div class="selectable-user" data-username="${username}">
        <span>${username}</span>
      </div>
    `);
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
    let channelElement = $('.channel-current');
    let currentChannel = channelElement.contents().first().text().trim();
    if (!currentChannel) {
      // Fallback to full text content and extract channel name
      let fullText = channelElement.text();
      currentChannel = fullText.replace(/\s*\(\d+\)\s*$/, '').trim();
    }
    if(currentChannel == data.channel) {
      $('.message-container').append(`
        <div class="message">
          <p class="message-user">${data.sender}: </p>
          <p class="message-text">${data.message}</p>
        </div>
      `);
      
      // Auto-scroll to bottom
      $('.message-container').scrollTop($('.message-container')[0].scrollHeight);
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
        let memberCount = channels[channelName].members ? channels[channelName].members.length : 0;
        let isPrivate = !channels[channelName].isPublic;
        let channelClass = isPrivate ? 'channel private-channel' : 'channel';
        $('.channels').append(`
          <div class="${channelClass}" title="${memberCount} members">
            ${channelName}
            <span class="channel-members">(${memberCount})</span>
          </div>
        `);
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
  socket.on('new channel', (channelData) => {
    let memberCount = channelData.members ? channelData.members.length : 0;
    let isPrivate = !channelData.isPublic;
    let channelClass = isPrivate ? 'channel private-channel' : 'channel';
    $('.channels').append(`
      <div class="${channelClass}" title="${memberCount} members">
        ${channelData.name}
        <span class="channel-members">(${memberCount})</span>
      </div>
    `);
  });

  // Make the channel joined the current channel. Then load the messages.
  // This only fires for the client who made the channel.
  socket.on('user changed channel', (data) => {
    $('.channel-current').addClass('channel');
    $('.channel-current').removeClass('channel-current');
    
    // Find channel by checking the text content of the first text node (before member count)
    $('.channel').each(function() {
      let channelText = $(this).contents().first().text().trim();
      if (channelText === data.channel) {
        $(this).addClass('channel-current').removeClass('channel');
        return false; // Break the loop
      }
    });
    
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
    
    // Auto-scroll to bottom after loading history
    setTimeout(() => {
      $('.message-container').scrollTop($('.message-container')[0].scrollHeight);
    }, 100);
  });

  // Handle incoming private messages
  socket.on('private message', (data) => {
    // Don't show messages from ourselves (we already showed it when sending)
    if(data.sender === currentUser) {
      return;
    }
    
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
      
      // Scroll to bottom
      $('.message-container').scrollTop($('.message-container')[0].scrollHeight);
      
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
    
    // Auto-scroll to bottom after loading history
    setTimeout(() => {
      $('.message-container').scrollTop($('.message-container')[0].scrollHeight);
    }, 100);
  });

  // Handle channel invitations
  socket.on('channel invitation', (data) => {
    let invitationMessage = `${data.invitedBy} has invited you to join the channel "${data.channel}"`;
    $('#invitation-message').text(invitationMessage);
    $('#invitation-notification').show();
    
    // Store the channel name for accept/decline actions
    $('#invitation-notification').data('channel', data.channel);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      $('#invitation-notification').hide();
    }, 10000);
  });

  // Handle invitation acceptance
  $('#accept-invitation-btn').click(() => {
    let channelName = $('#invitation-notification').data('channel');
    socket.emit('accept channel invitation', channelName);
    $('#invitation-notification').hide();
  });

  // Handle invitation decline
  $('#decline-invitation-btn').click(() => {
    $('#invitation-notification').hide();
  });

  // Handle errors
  socket.on('error', (errorData) => {
    alert('Error: ' + errorData.message);
  });

  // Close modal when clicking outside
  $(window).click((event) => {
    if (event.target.id === 'channel-modal') {
      $('#channel-modal').hide();
      clearChannelModal();
    }
  });

  // Helper functions
  function loadAvailableUsers() {
    $('#available-users-list').empty();
    $('#selected-users-list').empty();
    
    // Get list of online users (excluding current user)
    $('.user-online').each(function() {
      let username = $(this).text();
      if (username !== currentUser) {
        $('#available-users-list').append(`
          <div class="selectable-user" data-username="${username}">
            <span>${username}</span>
          </div>
        `);
      }
    });
  }

  function clearChannelModal() {
    $('#modal-channel-name').val('');
    $('#available-users-list').empty();
    $('#selected-users-list').empty();
  }

})
//app.js
const express = require('express');
const app = express();
const server = require('http').Server(app);

const io = require('socket.io')(server);
let onlineUsers = {};
//Save the channels in this object with their messages and members
let channels = {
  "General": {
    messages: [],
    members: [], 
    creator: "system",
    isPublic: true
  }
};
//Save private messages
let privateMessages = {};
//Save channel memberships for access control
let channelMemberships = {};

io.on("connection", (socket) => {
  // Make sure to send the channels to our chat file
  require('./sockets/chat.js')(io, socket, onlineUsers, channels, privateMessages, channelMemberships);
})

const exphbs  = require('express-handlebars');
app.engine('handlebars', exphbs.engine({
  defaultLayout: false
}));
app.set('view engine', 'handlebars');
//Establish your public folder
app.use('/public', express.static('public'))

app.get('/', (req, res) => {
  res.render('index.handlebars');
})


server.listen('3000', () => {
  console.log('Server listening on Port 3000');
})
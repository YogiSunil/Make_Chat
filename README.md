# Make Chat - Real-time Chat Application

A simple real-time chat application built with Node.js, Express, and Socket.io.

## Features

- Real-time messaging
- Clean and responsive UI
- Socket.io for real-time communication
- Express.js server
- Handlebars templating

## Project Structure

```
Make_chat/
├── public/
│   ├── index.css
│   └── index.js
├── sockets/
│   ├── chat.js
│   └── socketHandlers.js
├── views/
│   ├── layouts/
│   │   └── main.handlebars
│   └── index.handlebars
├── .gitignore
├── app.js
├── package.json
└── README.md
```

## Installation

1. Clone the repository or download the project files
2. Navigate to the project directory:
   ```bash
   cd Make_chat
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Start chatting! Open multiple browser tabs to test real-time messaging.

## Dependencies

- **express**: Web framework for Node.js
- **socket.io**: Real-time bidirectional event-based communication
- **express-handlebars**: Handlebars templating engine for Express

## Development Dependencies

- **nodemon**: Automatically restarts the server when files change

## Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with nodemon
- `npm test`: Run tests (placeholder)

## License

ISC
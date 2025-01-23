const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors({ origin: '*' }));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// List of clients
let clients = [];

// Broadcast function to send drawing data to all clients
const broadcast = (message, socket) => {
  console.log("Broadcasting message: ", message);
  clients.forEach(client => {
    if (client !== socket) {
      client.emit('message', message); 
    }
  });
};

// Handle new Socket.IO connections
io.on('connection', (socket) => {
  clients.push(socket);
  console.log('A new client connected');

  // Listen for messages from clients
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'user_connected') {
        // Send a user-connected message to all other clients
        broadcast(JSON.stringify({ type: 'user_connected', username: data.username }), socket);
      }

      if (data.type === 'draw') {
        const { x, y, brushColor, brushSize } = data;

        if (x === undefined || y === undefined || brushColor === undefined || brushSize === undefined) {
          console.error('Invalid drawing data received');
          return;
        }

        // Broadcast the drawing data to all other clients
        const drawingMessage = JSON.stringify({
          type: 'draw',
          x: x,
          y: y,
          brushColor: brushColor,
          brushSize: brushSize,
        });

        broadcast(drawingMessage, socket);
      }

    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    clients = clients.filter(client => client !== socket);
    console.log('A client disconnected');

    // Notify all users when a user disconnects
    broadcast(JSON.stringify({ type: 'user_disconnected', username: 'A user' }), socket);
  });
});

// Handle reset canvas event
app.post('/reset', (req, res) => {
  // Broadcast reset command to all clients
  broadcast(JSON.stringify({ type: 'reset_canvas' }));
  res.send('Canvas reset');
});

app.use('/', (req, res) => {
  res.send('Server is running successfully!');
});
// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

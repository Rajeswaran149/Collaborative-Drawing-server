const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors({ origin: '*' }));

// Create HTTP server and WebSocket server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

// List of clients
let clients = [];

// Broadcast function to send drawing data to all clients
const broadcast = (message, ws) => {
  console.log("Broadcasting message: ", message);
  clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Handle new WebSocket connections
wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('A new client connected');

  // Send the username of the new user
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'user_connected') {
        // Send a user-connected message to all other clients
        broadcast(JSON.stringify({ type: 'user_connected', username: data.username }), ws);
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

        broadcast(drawingMessage, ws);
      }

    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('A client disconnected');

    // Notify all users when a user disconnects
    broadcast(JSON.stringify({ type: 'user_disconnected', username: 'A user' }), ws);
  });
});

// Handle reset canvas event
app.post('/reset', (req, res) => {
  // Broadcast reset command to all clients
  broadcast(JSON.stringify({ type: 'reset_canvas' }));
  res.send('Canvas reset');
});

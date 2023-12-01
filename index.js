// index.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Parse JSON requests

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ messages: [], users: [] }).write();

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('login', (username) => {
    const user = { id: socket.id, username };
    const existingUser = db.get('users').find({ username }).value();

    if (existingUser) {
      // User already exists, update the socket ID
      db.get('users').find({ username }).assign({ id: socket.id }).write();
    } else {
      // New user, add to the list
      db.get('users').push(user).write();
    }

    io.emit('userConnected', user);
  });

  socket.on('message', (data) => {
    const user = db.get('users').find({ id: socket.id }).value();
    const message = { user, content: data };

    db.get('messages').push(message).write();
    io.emit('message', message);
  });

  socket.on('disconnect', () => {
    const user = db.get('users').find({ id: socket.id }).value();
    if (user) {
      io.emit('userDisconnected', user);
      db.get('users').remove({ id: socket.id }).write();
    }
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

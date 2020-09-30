const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

let socketHandler;
const STORE_TASK_NAME_JPG = 'final_store';
const STORE_TASK_NAME_VIDEO = 'final_store_VIDEO';

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/webhook', (req, res) => {
  if (!socketHandler) {
    return;
  }

  if (req.body.action !== 'fs.workflow') {
    return
  }

  const result = req.body.text.results[STORE_TASK_NAME_JPG] || req.body.text.results[STORE_TASK_NAME_VIDEO];
  socketHandler.emit('result', result);

  res.status(200).send('ok');
});

io.on('connection', (socket) => {
  socketHandler = socket;
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});


// results

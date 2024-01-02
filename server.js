const express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),

  ProxyAgent = require('proxy-agent').ProxyAgent;


app.use(express.static("public"));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

const server = http.Server(app);
server.listen(5000);

const io = socketIO(server, {
  cors: {
    origin: "https://quang.codocla.vn",
    methods: ["GET", "POST"]
  }
});

console.log('server is running')

const proxies = [
  "https://nviyzwin:04p3u2363za4@198.46.241.113:6648",
  "https://nviyzwin:04p3u2363za4@45.86.62.192:6121",
  "https://nviyzwin:04p3u2363za4@38.154.233.137:5547",
  "https://nviyzwin:04p3u2363za4@104.223.227.159:6682",
  "https://nviyzwin:04p3u2363za4@140.99.47.96:8087",
  "https://nviyzwin:04p3u2363za4@45.61.127.73:6012",
  "https://nviyzwin:04p3u2363za4@198.46.246.108:6732"
]

const roomList = {};

io.on('connection', function(socket) {
  console.log('new socket client config');
  let widgetId = socket.handshake.query.widgetid;
  socket.join(widgetId)
  let widgetSetting
  socket.on('updateSetting', data => {
    widgetSetting = data
    io.of('/widget').to(widgetId).emit('updateSetting', data);
  })
})

io.of('/widget').on('connection', function(socket){
  console.log('new widget socket client');
  let widgetId = socket.handshake.query.widgetid;
  socket.join(widgetId)
  
  socket.on('pass2control', ([e, data]) => {
 
    io.to(widgetId).emit(e, data);
  })
})

io.of('/control')
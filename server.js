const express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),
  ProxyAgent = require('proxy-agent').ProxyAgent;

const { WebcastPushConnection } = require('tiktok-live-connector');

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



const roomList = {};

class tiktokLiveRoom{
  constructor(id){
    let tiktokLiveConnection = new WebcastPushConnection(id)
    
    tiktokLiveConnection.connect().then(state => {
      console.info(`Connected to roomId ${state.roomId}`);
    }).catch(err => {
      console.error('Failed to connect', err);
    })
  }
}

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

let io_widget = io.of('/widget');
let io_web = io.of('/web');

io_widget.on('connection', function(socket){
  console.log('new widget socket client');
  let widgetId = socket.handshake.query.widgetid;
  socket.join(widgetId)
  
  
  socket.on('setUniqueId', id => {
    
  })
  // socket.on('pass2control', ([e, data]) => {
  //   io.to(widgetId).emit(e, data);
  // })
  
  // socket.emit('tiktokDisconnected')
  // socket.emit('tiktokConnected')
  // socket.emit('tiktokDisconnected')
  // socket.emit('streamEnd')
})

io_web.on('connection', function(socket){
  console.log('new webpage sonnected')
  let widgetId = socket.handshake.query.widgetid;
  
  socket.on('updateSetting', data => { io_widget.to(widgetId).emit('updateSetting', data) })
  
})
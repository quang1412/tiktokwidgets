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
    this.connect = new WebcastPushConnection(id)
    
    this.connect.connect().then(state => {
      console.info(`Connected to roomId ${state.roomId}`);
    }).catch(err => {
      console.error('Failed to connect', err);
    })
    this.doListen()
  }
  
  doListen(){
    this.connect.on('chat', data => {
      console.log(`${data.uniqueId} (userId:${data.userId}) writes: ${data.comment}`);
    })
    this.connect.on('gift', data => {
      console.log(`${data.uniqueId} (userId:${data.userId}) sends ${data.giftId}`);
    })
    
    // tiktokLiveConnection.on('member', data => {
    //   console.log(`${data.uniqueId} joins the stream!`);
    // })
    
    // tiktokLiveConnection.on('gift', data => {
    // if (data.giftType === 1 && !data.repeatEnd) {
    // // Streak in progress => show only temporary
    // console.log(`${data.uniqueId} is sending gift ${data.giftName} x${data.repeatCount}`);
    // } else {
    // // Streak ended or non-streakable gift => process the gift with final repeat_count
    // console.log(`${data.uniqueId} has sent gift ${data.giftName} x${data.repeatCount}`);
    // }
    // })
    
//     tiktokLiveConnection.on('roomUser', data => {
//     console.log(`Viewer Count: ${data.viewerCount}`);
// })
    
//     tiktokLiveConnection.on('like', data => {
//     console.log(`${data.uniqueId} sent ${data.likeCount} likes, total likes: ${data.totalLikeCount}`);
// })
  
//     tiktokLiveConnection.on('social', data => {
//     console.log('social event data:', data);
// })

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
  
  let tiktokId = ''
  socket.on('setUniqueId', function(id){
    if(id == tiktokId) return
    
    tiktokId = id
    
    
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
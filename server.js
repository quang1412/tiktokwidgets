var express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),
  server, io;


app.use(express.static("public"));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

server = http.Server(app);
server.listen(5000);

io = socketIO(server);

console.log('server is running')


const roomList = {};

class TikTokIOConnection {
  constructor(uniqueId, options) {
    this.socket = client.connect("https://tiktok-chat-reader.zerody.one");
    this.uniqueId = uniqueId;
    this.options = options;
    this.viewerCount = 0;
    this.likeCount = 0;
    this.diamondsCount = 0;

    this.socket.on('connect', () => {
      console.info("zerodySocket connected!");

      // Reconnect to streamer if uniqueId already set
      if (this.uniqueId) {
        // this.setUniqueId();
        this.reConnect()
      }
    })

    this.socket.on('greeting-from-server', (mess) => {
      console.log(mess);
    })

    this.socket.on('disconnect', () => {
      console.warn("Socket disconnected!");
    })

    this.socket.on('streamEnd', () => {
      console.warn("LIVE has ended!");
      this.uniqueId = null;
    })

    this.socket.on('tiktokDisconnected', (errMsg) => {
      console.warn(errMsg);
      if (errMsg && errMsg.includes('LIVE has ended')) {
        this.uniqueId = null;
      }
    });
    
    this.socket.onAny((eventName, ...args) => {
      io.of("/app").to(this.uniqueId).emit(eventName, ...args)
    })
    roomList[uniqueId] = this;
  }

  connect(uniqueId, options) {
    this.uniqueId = uniqueId;
    this.options = options || {};

    this.setUniqueId();

    return new Promise((resolve, reject) => {
      this.socket.once('tiktokConnected', resolve);
      this.socket.once('tiktokDisconnected', reject);

      setTimeout(() => {
        reject('Connection Timeout');
      }, 15000)
    })
  }

  setUniqueId() {
    this.socket.emit('setUniqueId', this.uniqueId, this.options);
  }

  on(eventName, eventHandler) {
    this.socket.on(eventName, eventHandler);
  }

  reConnect() { 
    if (this.uniqueId !== '') {

      console.log('Connecting...');

      this.connect(this.uniqueId, {
        enableExtendedGiftInfo: true
      }).then(state => {
        console.log(`Connected to roomId ${state.roomId}`);

        // reset stats
        this.viewerCount = 0;
        this.likeCount = 0;
        this.diamondsCount = 0;
        // updateRoomStats();

      }).catch(errorMessage => {
        console.log(errorMessage);

        // schedule next try if obs username set
        if (this.uniqueId) {
          setTimeout(() => {
            this.reConnect();
          }, 30000);
        }
      })

    } else {
      console.log('no username entered');
    }

  }
}

io.of('/app').on('connection', function(socket) {
  let _username;
  let currentUniqueId;
  //   const zerodySocket = new TikTokIOConnection();

  socket.on("setUniqueId", function(uniqueId, options) {
    if(uniqueId && currentUniqueId != uniqueId){
      socket.join(uniqueId);
      socket.leave(currentUniqueId);
      currentUniqueId = uniqueId
      !roomList[uniqueId] && new TikTokIOConnection(uniqueId, options)
    }
  })

  //   zerodySocket.on("eventname", function(data){

  //   }) 

})
var express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),
  server, io,
  ProxyAgent = require('proxy-agent').ProxyAgent;


app.use(express.static("public"));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

server = http.Server(app);
server.listen(5000);

io = socketIO(server);

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
 
class TikTokIOConnection {
  constructor(uniqueId, options) {
    this.socket = client.connect("https://tiktok-chat-reader.zerody.one");
    this.uniqueId = uniqueId;
    this.options = options;
    this.viewerCount = 0;
    this.likeCount = 0;
    this.diamondsCount = 0;
    this.state = null;

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
      
      roomList[this.uniqueId] = null
      delete roomList[this.uniqueId]
    })

    this.socket.on('tiktokDisconnected', (errMsg) => {
      console.warn(errMsg);
      if (errMsg && errMsg.includes('LIVE has ended')) {
        this.uniqueId = null;
        
        roomList[this.uniqueId] = null
        delete roomList[this.uniqueId]
      }
    });
    
    this.socket.onAny((eventName, ...args) => {
      io.of("/app").to(this.uniqueId).emit(eventName, ...args)
    }) 
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
      
      const randomInt = Math.floor(Math.random() * proxies.length);
      const randomProxy = proxies[randomInt];
      
      this.connect(this.uniqueId, {
        enableExtendedGiftInfo: true,
        requestOptions: {
          httpsAgent: new ProxyAgent(randomProxy),
          timeout: 10000 // 10 seconds
        }
      }).then(state => {
        console.log(`Connected to roomId ${state.roomId}`);
        io.of("/app").to(this.uniqueId).emit("tiktokConnected")
        // reset stats
        this.viewerCount = 0;
        this.likeCount = 0;
        this.diamondsCount = 0;
        this.state = state;
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
      
      const existRoom = roomList[uniqueId];
      if(existRoom){
        // existRoom.getState
        socket.emit("tiktokConnected", existRoom.state);
      } else {
        roomList[uniqueId] = new TikTokIOConnection(uniqueId, options);
      } 
    } 
  }) 
  socket.on("disconnect", (reason) => {
    // ...
  });

})

var express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),
  server, io;


app.use(express.static("public"));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/view/index.html');
});

server = http.Server(app);
server.listen(5000);

io = socketIO(server);

class TikTokIOConnection {
  constructor() {
    this.socket = client.connect("https://tiktok-chat-reader.zerody.one");
    this.uniqueId = null;
    this.options = null;

    this.socket.on('connect', () => {
      console.info("zerodySocket connected!");

      // Reconnect to streamer if uniqueId already set
      if (this.uniqueId) {
        this.setUniqueId();
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

  onAny(eventName, ...args) {
    this.socket.onAny((eventName, ...args) => {

    });
  }
}

io.of('/app').on('connection', function(socket) {
  const zerodySocket = new TikTokIOConnection();
  let username;
  
  function connect() {
    let uniqueId = username;
    if (uniqueId !== '') {

      console.log('connecting...')

      zerodySocket.connect(uniqueId, {
        enableExtendedGiftInfo: true
      }).then(state => {
        console.log(`Connected to roomId ${state.roomId}`);

        // reset stats
        // viewerCount = 0;
        // likeCount = 0;
        // diamondsCount = 0;
        // updateRoomStats();

      }).catch(errorMessage => {
        console.log(errorMessage);

        // schedule next try if obs username set
        if (window.settings.username) {
          setTimeout(() => {
            connect();
          }, 30000);
        }
      })

    } else {
      // alert('no username entered');
    }
  }


  socket.on("setUniqueId", function(uniqueId, options) {
    zerodySocket.connect(uniqueId, options);

  })
})
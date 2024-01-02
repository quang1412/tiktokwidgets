const express = require('express'),
  app = express(),
  http = require('http'),
  client = require("socket.io-client"),
  socketIO = require('socket.io'),
  bodyParser = require('body-parser'),
  cookieParser = require("cookie-parser"),
  engine = require('express-handlebars').engine,
  fs = require('fs'),
  ProxyAgent = require('proxy-agent').ProxyAgent,
  { WebcastPushConnection } = require('tiktok-live-connector');

app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json())

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

const server = http.Server(app);
server.listen(5000);

const io = socketIO(server, { cors: { origin: "https://quang.codocla.vn", methods: ["GET", "POST"] }});

console.log('server is running')

function makeid(length = 10) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function getWidgetConfig(widgetid){
  return new Promise(function(resolve, reject){
    let filePath = __dirname + '/server/widgetSetting/' + widgetid + '.json';
  
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (!err) {
        return resolve(data)
      } else {
        return reject(false)
      }
    });
  })
}

app.use(function (req, res, next) {
  let cookie = req.cookies.widgetid;
  if (cookie === undefined) {
    let randomNumber= makeid(20);
    randomNumber=randomNumber.substring(2,randomNumber.length);
    res.cookie('widgetid',randomNumber, { maxAge: 900000, httpOnly: true });
    console.log('cookie created successfully');
  } else {
    console.log('cookie exists', cookie);
  } 
  next();
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


app.get('/chatbox/obs', function(req, res) {
  let widgetid = req.query.widgetid
  if(!widgetid){ res.send('widgetid: ' + widgetid) }
});
app.get('/chatbox/', function(req, res) {
  let widgetid = req.cookies.widgetid;
  if(!widgetid){ res.send('widgetid: ' + widgetid) }
  
});


app.get('/widgetSetting',function(req, res){
  let widgetid = req.query.widgetid;
  let status = 404
  let setting = null
  getWidgetConfig(widgetid)
  .then(data => {
    setting = data
    status = 200
  })
  .catch(_ => {
  })
  .f(_ => {
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.write(setting);
    res.end();
  })
//   let filePath = __dirname + '/server/widgetSetting/' + widgetid + '.json';
  
//   fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
//       // let setting = 
//       if (!err) {
//         res.writeHead(200, {'Content-Type': 'application/json'});
//         res.write(data);
//         res.end();
//       } else {
//         res.writeHead(404, {'Content-Type': 'application/json'});
//         res.write('not found!');
//         res.end();
//       }
//   });

})
app.post('/widgetSetting', function(req, res){
  let widgetid = req.cookies.widgetid;
  let json = JSON.stringify(req.body.data)
  fs.writeFile(__dirname + '/server/widgetSetting/' + widgetid + '.json', json, 'utf8', function(){
    res.json({requestBody: json, widgetid: widgetid})
  });
})


app.get('/*', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

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
    
    this.connect.on('member', data => {
      console.log(`${data.uniqueId} joins the stream!`);
    })

    this.connect.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) {
      // Streak in progress => show only temporary
      console.log(`${data.uniqueId} is sending gift ${data.giftName} x${data.repeatCount}`);
    } else {
      // Streak ended or non-streakable gift => process the gift with final repeat_count
      console.log(`${data.uniqueId} has sent gift ${data.giftName} x${data.repeatCount}`);
    }
    })

    this.connect.on('roomUser', data => {
      console.log(`Viewer Count: ${data.viewerCount}`);
    })

    this.connect.on('like', data => {
      console.log(`${data.uniqueId} sent ${data.likeCount} likes, total likes: ${data.totalLikeCount}`);
    })

    this.connect.on('social', data => {
      console.log('social event data:', data);
    })

    this.connect.on('emote', data => {
      console.log('emote received', data);
    })

    this.connect.on('envelope', data => {
      console.log('envelope received', data);
    })

    this.connect.on('questionNew', data => {
      console.log(`${data.uniqueId} asks ${data.questionText}`);
    })

    this.connect.on('follow', (data) => {
      console.log(data.uniqueId, "followed!");
    })

    this.connect.on('share', (data) => {
      console.log(data.uniqueId, "shared the stream!");
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
const express = require("express"),
  app = express(),
  http = require("http"),
  // client = require("socket.io-client"),
  socketIO = require("socket.io"),
  bodyParser = require("body-parser"),
  cookieParser = require("cookie-parser"),
  engine = require("express-handlebars").engine,
  fs = require("fs"),
  { WebcastPushConnection } = require("tiktok-live-connector")
  // ProxyAgent = require("proxy-agent").ProxyAgent,

app.use(express.static("client/public"))
app.use(cookieParser())
app.use(bodyParser.json())

app.engine(".hbs", engine({ extname: ".hbs" }))
app.set("view engine", ".hbs")
app.set("views", "./client/views")

const server = http.Server(app)
server.listen(5000)

const io = socketIO(server, {
  // cors: { origin: "https://quang.codocla.vn", methods: ["GET", "POST"] },
}) 

console.log("server is running")

function makeid(length = 10) {
  let result = ""
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
} 

function getWidgetSetting(widgetid, widgetName) {
  return new Promise(function (resolve, reject) {
    let filePath = __dirname + "/server/widget_setting/" + widgetid + ".json" 
    fs.readFile(filePath, { encoding: "utf-8" }, function (err, data) { 
      if(!err){
        return resolve(JSON.parse(data))
      } else if(widgetName) {
        // GET DEFAULT
        let defaultPath = __dirname + "/server/widget_setting/default/" + widgetName + ".json" 
        fs.readFile(defaultPath, { encoding: "utf-8" }, function (err1, data1) {
          if(!err1){
            return resolve(JSON.parse(data1))
          } else {
            return reject(false)
          }
        })
      } else {
        return reject(false)
      }
    })
  })
}

app.use(function (req, res, next) {
  let path = req.path.replaceAll('/','') 
  let pathList = ['chatbox', 'alertbox']
  if(req.method == 'GET' && !!~pathList.indexOf(path)){  
    let widgetid = req.cookies.widgetid || makeid(20) 
    res.cookie("widgetid", widgetid, { path: req.path,  maxAge: 365 * 24 * 3600000, httpOnly: true })
  } else { }
  next()
})

// app.get("/", function (req, res) {
//  res.sendFile(__dirname + "/views/index.html")
 
// })


app.get("/setting", function (req, res) {
  let response = {success: true, data: '', message: ''}
  let widgetid = req.query.widgetid
  getWidgetSetting(widgetid).then((data) => {
    return res.status(200).json({ ...response, data: data, message: 'ok'})
  }).catch((e) => {
    return res.status(500).json({ ...response, success: false})
  })
})

app.post("/setting", function (req, res) {
  let response = {success: true, data: '', message: ''}
  try{
    let widgetid = req.body.widgetid
    let setting = req.body.setting
    fs.writeFile( __dirname + "/server/widget_setting/" + widgetid + ".json", JSON.stringify(setting), "utf8", function () {
      res.status(200).json({ ...response, message: 'setting saved', data: setting})
    })
  } catch(e){
    res.status(400).json({ ...response, success: false })
  }
})

app.get("/", function (req, res) { 
  res.send('<p><a href="/chatbox">chatbox</a></p>')
})

app.get("/chatbox", function (req, res) {
  let widgetid = req.cookies.widgetid
  getWidgetSetting(widgetid, 'chatbox').then((setting) => {  
    res.render("config_chatbox", {
      layout: "main",
      title: "Chatbox",
      widgetid: widgetid,
      setting: setting,
    })
  }).catch(e => {
    res.redirect('/error?m=error text')
  })
})
app.get("/chatbox/obs", function (req, res) {
  let widgetid = req.query.widgetid
  if (!widgetid) { return res.redirect('/error?m=widget id not found!') }
 
  getWidgetSetting(widgetid).then((setting) => {  
    res.render("obs_chatbox", {
      layout: "obs",
      title: "OBS chatbox widget",
      widgetid: widgetid,
      setting: setting,
    })
  }).catch(e => {
    res.redirect('/error?m=widgetid invalid!')
  })
})

app.get("/alertbox/obs", function (req, res) {
  let widgetid = req.query.widgetid
  if (!widgetid) { return res.redirect('/error?m=widget id not found!') }
 
  getWidgetSetting(widgetid, alertbox).then((setting) => {  
    res.render("obs_alertbox", {
      layout: "obs",
      title: "Alertbox",
      widgetid: widgetid,
      setting: setting,
    })
  }).catch(e => {
    res.redirect('/error?m=widgetid invalid!')
  })
})

app.get('/*', function(req, res){
  let m = req.query.m
  res.render("error", {
    layout: false,
    message: m
  })
})

const webcasts = {
  list:{},
  add: function(id, webcast){
    if(!id || !webcast || this.list[id]) return;
    this.list[id] = webcast
  },
  get: function(id){
    return this.list[id];
  },
  delete: function(id){
    delete this.list[id]
  }
}

class tiktokLiveRoom {
  constructor(username, options) {
    this.connect = new WebcastPushConnection(username, options);
    this.state = null
    this.username = username 

    this.doConnect()
    this.doListen()
  }

  doConnect() {
    this.connect.connect().then((state) => { 
      this.emit('tiktokConnected', state)
      this.state = state
      console.log(`Connected to roomId ${state.roomId}`)
    }).catch((err) => {
      this.emit('tiktokDisconnected', err.message) 
    })
  }

  doListen() { 
    this.connect.on("chat", (data) => {
      this.emit('chat', data)
      console.log(`${data.uniqueId} (userId:${data.userId}) writes: ${data.comment}`)
    })

    this.connect.on("like", (data) => {
      this.emit('like', data)
      console.log(`${data.uniqueId} sent ${data.likeCount} likes, total likes: ${data.totalLikeCount}`)
    })

    this.connect.on("follow", (data) => {
      this.emit('follow', data)
      console.log(data.uniqueId, "followed!")
    })

    this.connect.on("share", (data) => {
      this.emit('share', data)
      console.log(data.uniqueId, "shared the stream!")
    })

    this.connect.on("gift", (data) => {
      if (data.giftType === 1 && !data.repeatEnd) {
        // Streak in progress => show only temporary
      this.emit('gift', data)
      console.log(`${data.uniqueId} is sending gift ${data.giftName} x${data.repeatCount}`)
      } else {
        // Streak ended or non-streakable gift => process the gift with final repeat_count
      this.emit('gift', data)
      console.log(`${data.uniqueId} has sent gift ${data.giftName} x${data.repeatCount}`)
      }
    })

    this.connect.on("roomUser", (data) => {
      this.emit('roomUser', data)
      console.log(`Viewer Count: ${data.viewerCount}`)
    })

    this.connect.on('streamEnd', (actionId) => { 
      this.emit('streamEnd', actionId)
      this.state.isConnected = false 
      if (actionId === 3) {
          console.log('Stream ended by user');
      }
      if (actionId === 4) {
          console.log('Stream ended by platform moderator (ban)');
      }
    })

    this.connect.on('disconnected', () => {
      this.state.isConnected = false
      this.emit('tiktokDisconnected', 'network disconnected') 
      console.log('\n\n DISCONNECTED :( \n\n');
    })

    // this.connect.on("gift", (data) => {
    //   this.emit('gift', data)
    //   console.log(`${data.uniqueId} (userId:${data.userId}) sends ${data.giftId}`)
    // })

    // this.connect.on("member", (data) => {
    //   this.emit('member', data)
    //   console.log(`${data.uniqueId} joins the stream!`)
    // })

    // this.connect.on("social", (data) => {
    //   this.emit('social', data)
    //   console.log("social event data:", data)
    // })

    // this.connect.on("emote", (data) => {
    //   this.emit('emote', data)
    //   console.log("emote received", data)
    // })

    // this.connect.on("envelope", (data) => {
    //   this.emit('envelope', data)
    //   console.log("envelope received", data)
    // })

    // this.connect.on("questionNew", (data) => {
    //   this.emit('questionNew', data)
    //   console.log(`${data.uniqueId} asks ${data.questionText}`)
    // })
  }

  emit(eventName, data){
    io.to(this.username).emit(eventName, data) 
  }
}


io.on("connection", function (socket) {
  let widgetid = socket.handshake.query.widgetid
  widgetid && socket.join(widgetid)
  let tiktokid = socket.handshake.query.tiktokid
  tiktokid && socket.join(tiktokid)

  socket.on("setUniqueId", function (id, options) {
    id = id.replace('@', '')

    if(!id || id == null || id == '' || id == undefined || id == tiktokid){ return }
    if(typeof(options) != 'object'){ return }

    socket.leave(tiktokid)
    socket.join(id)

    tiktokid = id

    let webcast = webcasts.get(id);

    if(webcast){
      webcast.state.isConnected ? socket.emit('tiktokConnected', webcast.state) : webcast.doConnect()
      return
    }

    webcast = new tiktokLiveRoom(id, options)
    webcasts.add(id, webcast)  
  })

  socket.on("updateSetting", (data) => {
    if(typeof(data) != 'object' || !data.username){ return }

    io.to(widgetid).emit("updateSetting", data)
    
    let i = data.username
    socket.leave(tiktokid)
    socket.join(i)
    tiktokid = i
  })
}) 
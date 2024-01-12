require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokConnectionWrapper, getGlobalConnectionCount } = require('./connectionWrapper');
const { clientBlocked } = require('./limiter');

const app = express();
const httpServer = createServer(app);

// Enable cross origin resource sharing
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

const tiktokPrefix = 'reqsdqwe_';
const socketRooms = new Object();

io.on('connection', (socket) => {
    let currentUniqueId;

    console.info('New connection from origin', socket.handshake.headers['origin'] || socket.handshake.headers['referer']);

    socket.on('setUniqueId', (uniqueId, options) => {
        uniqueId = uniqueId.replace('@', '');

        if(!uniqueId || uniqueId == 'null' || uniqueId == 'undefined'){
            return
        }

        // Prohibit the client from specifying these options (for security reasons)
        if (typeof options === 'object' && options) {
            delete options.requestOptions;
            delete options.websocketOptions;
        } else {
            options = {};
        }

        // Session ID in .env file is optional
        if (process.env.SESSIONID) {
            options.sessionId = process.env.SESSIONID;
            console.info('Using SessionId');
        }

        // Check if rate limit exceeded
        if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
            socket.emit('tiktokDisconnected', 'You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid that the server IP gets blocked by TokTok.');
            return;
        }
        
        socket.leave(tiktokPrefix + currentUniqueId);
        socket.join(tiktokPrefix + uniqueId);
        currentUniqueId = uniqueId;
    });
});

// io.of("/").adapter.on("create-room", (room) => {
//     if(!room.includes(tiktokPrefix)){ return } 
     
//     console.log(`room ${room} was created`);
// }); 

io.of("/").adapter.on("join-room", (room, id) => {
    if(!room.includes(tiktokPrefix)){ return }

    const roomEmit = function(event, ...data){ io.sockets.in(room).emit(event, ...data) };
    const uniqueId = room.replace(tiktokPrefix, '');
    let tiktokConnectionWrapper = socketRooms[uniqueId];

    if(tiktokConnectionWrapper){
        let state = tiktokConnectionWrapper.connection.getState();
        state.isConnected && io.sockets.in(room).to(id).emit('tiktokConnected', state); 
        return;
    } else { 
        try {
            tiktokConnectionWrapper = new TikTokConnectionWrapper(uniqueId, {}, true);
            socketRooms[uniqueId] = tiktokConnectionWrapper;
            tiktokConnectionWrapper.connect();
        } catch (err) {
            roomEmit('tiktokDisconnected', err.toString());
            delete socketRooms[uniqueId]; 
        }
        
        tiktokConnectionWrapper.once('connected', state => roomEmit('tiktokConnected', state));
        tiktokConnectionWrapper.once('disconnected', reason => {
            roomEmit('tiktokDisconnected', reason);
            delete socketRooms[uniqueId];
        });

        tiktokConnectionWrapper.connection.on('roomUser', msg => roomEmit('roomUser', msg));
        tiktokConnectionWrapper.connection.on('member', msg => roomEmit('member', msg));
        tiktokConnectionWrapper.connection.on('chat', msg => roomEmit('chat', msg));
        tiktokConnectionWrapper.connection.on('gift', msg => roomEmit('gift', msg));
        tiktokConnectionWrapper.connection.on('social', msg => roomEmit('social', msg));
        tiktokConnectionWrapper.connection.on('like', msg => roomEmit('like', msg));
        tiktokConnectionWrapper.connection.on('questionNew', msg => roomEmit('questionNew', msg));
        tiktokConnectionWrapper.connection.on('linkMicBattle', msg => roomEmit('linkMicBattle', msg));
        tiktokConnectionWrapper.connection.on('linkMicArmies', msg => roomEmit('linkMicArmies', msg));
        tiktokConnectionWrapper.connection.on('liveIntro', msg => roomEmit('liveIntro', msg));
        tiktokConnectionWrapper.connection.on('emote', msg => roomEmit('emote', msg));
        tiktokConnectionWrapper.connection.on('envelope', msg =>     roomEmit('envelope', msg));
        tiktokConnectionWrapper.connection.on('subscribe', msg => roomEmit('subscribe', msg));
        
        tiktokConnectionWrapper.connection.on('streamEnd', () => {
            roomEmit('streamEnd');
            delete socketRooms[uniqueId];
        });
    } 

});

io.of("/").adapter.on("delete-room", (room) => {
    if(!room.includes(tiktokPrefix)){ return }
    
    const uniqueId = room.replace(tiktokPrefix, '');
    let tiktokConnectionWrapper = socketRooms[uniqueId];
    
    if(!tiktokConnectionWrapper){ return }

    setTimeout(function(){
        if(!io.sockets.adapter.rooms.has(room)){
            tiktokConnectionWrapper.disconnect();
            delete socketRooms[uniqueId];
            console.log(`room ${room} was deleted`);
        }
    }, 10000)

    // if (tiktokConnectionWrapper) {
    //     tiktokConnectionWrapper.disconnect();
    // }
});

// Emit global connection statistics
setInterval(() => {
    io.emit('statistic', { globalConnectionCount: getGlobalConnectionCount() });
}, 5000)

// Serve frontend files
app.use(express.static('public'));

// Start http listener
const port = process.env.PORT || 8081;
httpServer.listen(port);
console.info(`Server running! Please visit http://localhost:${port}`);
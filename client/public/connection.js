/**
 * Wrapper for client-side TikTok connection over Socket.IO
 * With reconnect functionality.
 */
window.TikTokIOConnection = class {
  constructor(widgetid = '', tiktokid = '') {
    // this.socket = window.io("/app");
    this.socket = window.io("/" ,{ query: 'widgetid=' + widgetid + '&tiktokid=' + tiktokid});
    this.uniqueId = null;
    this.options = null;

    this.socket.on('connect', () => {
      console.info("Socket connected!");

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

  connect(uniqueId, options = new Object()) {
    this.uniqueId = uniqueId;
    this.options = options;

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
    window.localStorage.setItem('uniqueId', this.uniqueId)
  }

  on(eventName, eventHandler) {
    this.socket.on(eventName, eventHandler);
  }

  emit(eventName, ...args) {
    this.socket.emit(eventName, ...args);
  }
}

window.likeThrottler = {
  duration: 15000,
  counter: {},
  add: function(data){
    const {uniqueId, likeCount} = data
    return new Promise((resolve, reject) => {  
      if(!likeCount){
        return reject()
      }  
      this.counter[uniqueId] = (this.counter[uniqueId] || 0) + likeCount 
      const total = this.counter[uniqueId]
      setTimeout(() => { 
        if(total == this.counter[uniqueId]){
          resolve(total)
          delete this.counter[uniqueId]
        } else {
          reject()
        }
      }, this.duration)
    }) 
  }
}
(function(){
  // This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
  // let backendUrl = "https://tiktok-chat-reader.zerody.one";
  let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
  let connection = new window.TikTokIOConnection();

  const ioServer = window.io("/widget", {query: `widgetid=${window.widgetId}`});
  ioServer.on('connect', () => { console.log('📡 Server connected') })


  window.addEventListener('load', () => {  
      window.settings.username && connect()
  })

  connection.on('streamEnd', () => {
    $('#stateText').text('Stream ended.');

    // schedule next try if obs username set
    if (window.settings.username) {
      setTimeout(() => {
        connect(window.settings.username);
      }, 30000);
    }
  })

  function connect() {
      const uniqueId =  window.settings.username || $('#uniqueIdInput').val()
      if (uniqueId !== '') {

          $('#stateText').text('Connecting...');
          console.log('Tiktok connecting...');
          connection.connect(uniqueId, {
              enableExtendedGiftInfo: true
          }).then(state => {
            $('#stateText').text(`Connected to roomId ${state.roomId}`);  
            console.log('Tiktok connected');
            setTimeout(() => {
              $('#stateText').hide()
            }, 10000)
          }).catch(errorMessage => {
            $('#stateText').text(errorMessage);
            console.log('Tiktok connect error: ', errorMessage);
              // if (window.settings.username) {
              //     setTimeout(() => {
              //         connect(window.settings.username);
              //     }, 30000);
              // }
          })

      } else {
          alert('no username entered');
      }
  } 

  function isPendingStreak(data) {
    if (data.giftType === 1 && !data.repeatEnd) {
      // Streak in progress => show only temporary
      return true
    } else {
      // Streak ended or non-streakable gift => process the gift with final repeat_count
      return false
    }
  }

  function isEndedStreak(data){
    if (data.giftType === 1 && !data.repeatEnd) {
      // Streak in progress => show only temporary
      return false
    } else {
      // Streak ended or non-streakable gift => process the gift with final repeat_count
      return true
    }
  }

  setInterval(_ => { 
    $(':nth-child(n+21 of div.message)').remove()
  }, 3000)

  const acknowledged = []

  function isNotDuplicate(id){
    let i = id.substr(id.length - 10)
    let r = !~acknowledged.indexOf(i)
    if(r){
      acknowledged.unshift(i)
      if(acknowledged.length > 50){
          acknowledged.length = 50;
      }
    }
    return r
  }

  const followRoleTitle = ['người xem', 'theo dõi', 'bạn bè']

  class Message{
    constructor(data){
      this.data = data;
      let html = $('<div>').addClass('message')

      this.name = $('<div>').addClass('name').text(data.uniqueId).css({'font-weight':500, 'display':'flex'}).appendTo(html)

      let text = $('<div>').addClass('comment').text(data.comment || '').appendTo(html)

      let {comment, uniqueId, topGifterRank, nickname, followRole, followInfo, isModerator, isSubscriber, isNewGifter} = data
      let {followerCount} = followInfo
      console.log({comment, uniqueId, topGifterRank, nickname, followRole, followerCount, isModerator, isSubscriber, isNewGifter})

      let info = `<br><small>followRole: ${followRole}, topGifterRank: ${topGifterRank}, isNewGifter: ${isNewGifter}, isSubscriber: ${isSubscriber}, </small>`
      html.append(info)

      html.attr('data-topGifterRank', topGifterRank);
      html.attr('data-followRole', followRole);
      // html.attr('data-isModerator', isModerator);
      html.attr('data-isSubscriber', isSubscriber);
      html.attr('data-isNewGifter', isNewGifter);

      $('#message-container').prepend(html)
    }

    badges(){
      // let {comment, uniqueId, topGifterRank, followRole, followInfo, isSubscriber} = this.data

      let e = $('<span>').addClass('badges')

      $('<span>').addClass('badge-follow').text(followRoleTitle[this.data.followRole]).appendTo(e)

      return e
    }
  }

  ioServer.on('updateSetting', data => {
    if(data.username != window.settings.username){
      window.location.reload()
    }
    window.settings = data 
  })

  connection.on('chat', (data) => { 
    if(!isNotDuplicate(data.secUid)){
      return
    }
    new Message(data)

    ioServer.emit('pass2control', ['chat', data])
  }) 

  connection.on('statistic', (data) => {   
    ioServer.emit('pass2control', ['statistic', data])
  }) 

  // connection.on('streamEnd', () => {
  //     $('#stateText').text('Stream ended.');
  //     console.log('Tiktok connected');

  //     // schedule next try if obs username set
  //     if (window.settings.username && isObs) {
  //         setTimeout(() => {
  //             connect(window.settings.username);
  //         }, 30000);
  //     }

  // }) 
})()
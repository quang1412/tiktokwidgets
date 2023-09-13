// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
// let backendUrl = "https://tiktok-chat-reader.zerody.one";
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let connection = new TikTokIOConnection();
// let connection = new TikTokIOConnection("https://tiktok-chat-reader.zerody.one/");


// Counter
let viewerCount = 0;
let likeCount = 0;
let diamondsCount = 0;

// These settings are defined by obs.html
if (!window.settings) window.settings = {};

$(document).ready(() => {
    $('#connectButton').click(connect);
    $('#uniqueIdInput').on('keyup', function (e) {
        if (e.key === 'Enter') {
            connect();
        }
    });

    if (window.settings.username) connect();
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
    let uniqueId = window.settings.username || $('#uniqueIdInput').val();
    if (uniqueId !== '') {

        $('#stateText').text('Connecting...');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: true
        }).then(state => {
            $('#stateText').text(`Connected to roomId ${state.roomId}`);
 

        }).catch(errorMessage => {
            $('#stateText').text(errorMessage);

            if (window.settings.username) {
                setTimeout(() => {
                    connect(window.settings.username);
                }, 30000);
            }
        })

    } else {
        alert('no username entered');
    }
} 


connection.on('streamEnd', () => {
    $('#stateText').text('Stream ended.');

    // schedule next try if obs username set
    if (window.settings.username) {
        setTimeout(() => {
            connect(window.settings.username);
        }, 30000);
    }
}) 

class rankItem{
  constructor(userInfo = {}){
    this.info = userInfo;
    this.score = 0;
    this.DOM = $(`<div class="rankitem" data-userId="${this.info.userId}" style="display:none; top:100vh;">`).html(`
    <div class="number">-</div>
    <img class="image" src="${this.info.profilePictureUrl}">
    <div class="name">${this.info.nickname}</div>
    <div class="score animate__animated" style="display:block">${this.score}</div>`)
    
    // this.setOrder(10)
  }

  appendTo(parent){
    this.DOM.appendTo(parent);
  }

  addScore(n){
    const animateName = "animate__heartBeat"
    const numberDiv = this.DOM.find('div.score')
    // $(numberDiv).addClass(animateName)
    this.score += n;
    
    $(numberDiv).text(this.score)
    
    // setTimeout(() => $(numberDiv).text(this.score), 300)
    // $(numberDiv).one("webkitAnimationEnd animationend", (evt) => {
    //   $(numberDiv).removeClass(animateName)
    // });
  }

  setOrder(n){
    if(typeof n != 'number') return
    const order = n+1
    this.DOM.removeClass('top')
    if(order <= 3) {
      this.DOM.addClass('top')
    }

    const topPx = (n * this.DOM.outerHeight()) + (n * 10) + 'px';
    this.DOM.css('top', topPx);
    this.DOM.find('.number').text(order)
  }
  show(){
    this.DOM.show()
  }
  hidden(){
    this.DOM.hide()
  }
}

function sortingRankItems(rankItems){
  const maxItemsCount = 10;
  
  const list = []
  for (var userId in rankItems) {
    list.push(rankItems[userId]);
  } 

  list.sort(function(item_a, item_b) { 
    return item_b.score - item_a.score;
  })
 
  list.map((item, i) => { 
    if(i < maxItemsCount){
      item.show()
      item.setOrder(i)
    } else {
      item.hidden()
    }
  })
}

$(document).ready(function(){
  if(window.settings.rankEvent && window.settings.rankEvent !== 'like') return
  
  let container = $('#likerank .rankitems');
  let rankItems = {} 
   
  connection.on('like', (msg) => {
    const {userId} = msg

    let user = rankItems[userId]
    if(!user){
      rankItems[userId] = new rankItem(msg)
      user = rankItems[userId]
      user.appendTo(container)
    } 

    if (typeof msg.totalLikeCount === 'number') {
      likeCount = msg.totalLikeCount;
      // updateRoomStats();
    } 
    if (typeof msg.likeCount === 'number') { 
      user.addScore(msg.likeCount)
      
      sortingRankItems(rankItems)
    }
  }) 

  // setInterval(function(){
  //   rankItems = {}
  //   container.html(null)
  // }, 2*60*1000)
})

$(document).ready(function(){
  if(window.settings.rankEvent && window.settings.rankEvent !== 'chat') return
  
  let container = $('#chatrank .rankitems');
  let rankItems = {} 
   
  connection.on('chat', (msg) => {
    const {userId} = msg

    let user = rankItems[userId]
    if(!user){
      rankItems[userId] = new rankItem(msg)
      user = rankItems[userId]
      user.appendTo(container)
    } 
 
    if (typeof msg.comment === 'string') { 
      user.addScore(msg.comment.length)
      
      sortingRankItems(rankItems)
    }
  }) 

  // setInterval(function(){
  //   rankItems = {}
  //   container.html(null)
  // }, 2*60*1000)
})

$(document).ready(function(){
  if(window.settings.rankEvent && window.settings.rankEvent !== 'share') return
  
  let container = $('#sharerank .rankitems');
  let rankItems = {} 
   
  
  connection.on('social', (msg) => {
    if(!msg.displayType.includes('share')) return
    
    const {userId} = msg

    let user = rankItems[userId]
    if(!user){
      rankItems[userId] = new rankItem(msg)
      user = rankItems[userId]
      user.appendTo(container)
    }  
    
    user.addScore(1)
    sortingRankItems(rankItems)
  }) 

  // setInterval(function(){
  //   rankItems = {}
  //   container.html(null)
  // }, 2*60*1000)
})

$(document).ready(function(){
  if(window.settings.rankEvent && window.settings.rankEvent !== 'gift') return
  
  let container = $('#giftrank .rankitems');
  let rankItems = {} 
   
  
  connection.on('gift', (msg) => {
    const {userId} = msg

    let user = rankItems[userId]
    if(!user){
      rankItems[userId] = new rankItem(msg)
      user = rankItems[userId]
      user.appendTo(container)
    }  
    
    user.addScore(msg.diamondCount)
    sortingRankItems(rankItems)
  }) 

  // setInterval(function(){
  //   rankItems = {}
  //   container.html(null)
  // }, 2*60*1000)
})
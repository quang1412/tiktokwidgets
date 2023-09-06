// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
// let backendUrl = "https://tiktok-chat-reader.zerody.one";
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let connection = new TikTokIOConnection(backendUrl);

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

function connect() {
    let uniqueId = window.settings.username || $('#uniqueIdInput').val();
    if (uniqueId !== '') {

        $('#stateText').text('Connecting...');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: true
        }).then(state => {
            $('#stateText').text(`Connected to roomId ${state.roomId}`);

            // reset stats
            viewerCount = 0;
            likeCount = 0;
            diamondsCount = 0;
            updateRoomStats();

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

// Prevent Cross site scripting (XSS)
function sanitize(text) {
    return text.replace(/</g, '&lt;')
}

function updateRoomStats() {
    $('#roomStats').html(`Viewers: <b>${viewerCount.toLocaleString()}</b> Likes: <b>${likeCount.toLocaleString()}</b> Earned Diamonds: <b>${diamondsCount.toLocaleString()}</b>`)
}

function generateUsernameLink(data) {
    return `<a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.uniqueId}</a>`;
}

function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

/**
 * Add a new message to the chat container
 */
function addChatItem(color, data, text, summarize) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.chatcontainer');

    if (container.find('div').length > 500) {
        container.find('div').slice(0, 200).remove();
    }

    container.find('.temporary').remove();;

    container.append(`
        <div class=${summarize ? 'temporary' : 'static'}>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            <span>
                <b>${generateUsernameLink(data)}:</b> 
                <span style="color:${color}">${sanitize(text)}</span>
            </span>
        </div>
    `);

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 400);
}

/**
 * Add a new gift to the gift container
 */
function addGiftItem(data) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.giftcontainer');

    if (container.find('div').length > 200) {
        container.find('div').slice(0, 100).remove();
    }

    let streakId = data.userId.toString() + '_' + data.giftId;

    let html = `
        <div data-streakid=${isPendingStreak(data) ? streakId : ''}>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            <span>
                <b>${generateUsernameLink(data)}:</b> <span>${data.describe}</span><br>
                <div>
                    <table>
                        <tr>
                            <td><img class="gifticon" src="${data.giftPictureUrl}"></td>
                            <td>
                                <span>Name: <b>${data.giftName}</b> (ID:${data.giftId})<span><br>
                                <span>Repeat: <b style="${isPendingStreak(data) ? 'color:red' : ''}">x${data.repeatCount.toLocaleString()}</b><span><br>
                                <span>Cost: <b>${(data.diamondCount * data.repeatCount).toLocaleString()} Diamonds</b><span>
                            </td>
                        </tr>
                    </tabl>
                </div>
            </span>
        </div>
    `;

    let existingStreakItem = container.find(`[data-streakid='${streakId}']`);

    if (existingStreakItem.length) {
        existingStreakItem.replaceWith(html);
    } else {
        container.append(html);
    }

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 800);
}


// viewer stats
connection.on('roomUser', (msg) => {
    if (typeof msg.viewerCount === 'number') {
        viewerCount = msg.viewerCount;
        updateRoomStats();
    }
})

// like stats
connection.on('like', (msg) => {
    if (typeof msg.totalLikeCount === 'number') {
        likeCount = msg.totalLikeCount;
        updateRoomStats();
    }

    if (window.settings.showLikes === "0") return;

    if (typeof msg.likeCount === 'number') {
        addChatItem('#447dd4', msg, msg.label.replace('{0:user}', '').replace('likes', `${msg.likeCount} likes`))
    }
})

// Member join
let joinMsgDelay = 0;
connection.on('member', (msg) => {
    if (window.settings.showJoins === "0") return;

    let addDelay = 250;
    if (joinMsgDelay > 500) addDelay = 100;
    if (joinMsgDelay > 1000) addDelay = 0;

    joinMsgDelay += addDelay;

    setTimeout(() => {
        joinMsgDelay -= addDelay;
        addChatItem('#21b2c2', msg, 'joined', true);
    }, joinMsgDelay);
})

// New chat comment received
connection.on('chat', (msg) => {
    if (window.settings.showChats === "0") return;

    addChatItem('', msg, msg.comment);
})

// New gift received
connection.on('gift', (data) => {
    if (!isPendingStreak(data) && data.diamondCount > 0) {
        diamondsCount += (data.diamondCount * data.repeatCount);
        updateRoomStats();
    }

    if (window.settings.showGifts === "0") return;

    addGiftItem(data);
})

// share, follow
connection.on('social', (data) => {
    if (window.settings.showFollows === "0") return;

    let color = data.displayType.includes('follow') ? '#ff005e' : '#2fb816';
    addChatItem(color, data, data.label.replace('{0:user}', ''));
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


let usersInfo = {},
    usersLikeCount = {},
    usersGiftCount = {},
    usersShareCount = {};

let topLike = [],
    topGift = [],
    topShare = [];

function saveUserInfo(data){
  const {userId, uniqueId, nickname, profilePictureUrl} = data
  
  if(userId){
    usersInfo[userId] = {userId, uniqueId, nickname, profilePictureUrl}
    usersLikeCount[userId] = usersLikeCount[userId] || 0
    usersGiftCount[userId] = usersGiftCount[userId] || 0
    usersShareCount[userId] = usersShareCount[userId] || 0
  }
}


// function createRankItem(order = 0, userInfo = {}){
//   const {userId, uniqueId, nickname, profilePictureUrl} = userInfo 
//   let item = $(`<div class="rankitem" data-userId="${userId||''}">`).html(`<div class="number">
//         <span>1</span>
//       </div>
//       <img class="image" src="https://cdn.glitch.global/7252e33f-9435-4935-b23d-68d0102bb6d5/default_avatar.webp?v=1693995142209">
//       <span class="name">${nickname || 'name'}</span>
//       <span class="score">1430</span>`)
//   // $('div.rankitems').append(item) 
  
//   return item;
// }


class rankItem{
  constructor(userInfo = {}){
    this.info = userInfo;
    this.score = 0;
    this.DOM = $(`<div class="rankitem" data-userId="${this.info.userId}" style="display:none;">`).html(`
      <div class="number">-</div>
      <img class="image" src="${this.info.profilePictureUrl}">
      <div class="name">${this.info.nickname}</div>
      <div class="score animate__animated" style="display:block">${this.score}</div>`)
  }
  
  appendTo(parent){
    this.DOM.appendTo(parent);
  }
  
  addScore(n){
    const number = this.DOM.find('.score')
    $(number).addClass("animate__heartBeat")
    this.score += n;
    number.text(this.score)
    $(number).one("webkitAnimationEnd animationend", function(evt) {
      $(number).removeClass("animate__heartBeat")
    });
  }
  
  setOrder(n){
    if(typeof n != 'number') return
    this.DOM.show()
    const order = n+1
    this.DOM.removeClass('top')
    if(order <= 3) {
      this.DOM.addClass('top')
    }
    
    const top = (n * this.DOM.outerHeight()) + (n * 10) + 'px';
    this.DOM.css('top', top);
    this.DOM.find('.number').text(order)
  }
}

// $(document).ready(function(){
//   const item = new rankItem()
//   item.appendTo($('#likerank .rankitems'))
//   item.setOrder(0)
  
//   const item2 = new rankItem()
//   item2.appendTo($('#likerank .rankitems'))
//   item2.setOrder(1)
// })

const likeRankItems = {}

// function createRankItem(userInfo = {}){
//   const {userId} = userInfo;
//   if(!rankItems[userId]){
//     rankItems[userId] = new rankItem(userInfo)
//   }
// }


function refreshLikeRanking(){
  const ordered = []
  for (var userId in likeRankItems) {
    ordered.push(likeRankItems[userId]);
  }
  
  if(!ordered.length) return
  
  ordered.sort(function(item_a, item_b) { 
    return item_b.score - item_a.score;
  })
  ordered.map((item, i) => {
    // const userId = item[0]
    // const item = likeRankItems[userId] 
    item.setOrder(i) 
  })
}

connection.on('like', (msg) => {
  const {userId} = msg
  
  let user = likeRankItems[userId]
  if(!user){
    likeRankItems[userId] = new rankItem(msg)
    user = likeRankItems[userId]
    user.appendTo($('#likerank .rankitems'))
  }
  
  
  // saveUserInfo(msg)
  
  if (typeof msg.totalLikeCount === 'number') {
    likeCount = msg.totalLikeCount;
    // updateRoomStats();
  }

  // if (window.settings.showLikes === "0") return;

  if (typeof msg.likeCount === 'number') {
      // addChatItem('#447dd4', msg, msg.label.replace('{0:user}', '').replace('likes', `${msg.likeCount} likes`))
    // usersLikeCount[userId] += msg.likeCount
    user.addScore(msg.likeCount)
    refreshLikeRanking()
  }
})


// function topLikeSorting(){
//   topLike = []
//   for (var userId in likeRankItems) {
//     topLike.push([userId, likeRankItems[userId]]);
//   }
  
//   topLike.sort(function(a, b) {
//     return b[1].score - a[1].score;
//   })
// }


// setInterval(function(){
//   // topLikeSorting()
//   const ordered = []
//   for (var userId in likeRankItems) {
//     ordered.push(likeRankItems[userId]);
//   }
  
//   if(!ordered.length) return
  
//   ordered.sort(function(item_a, item_b) { 
//     return item_b.score - item_a.score;
//   })
//   ordered.map((item, i) => {
//     // const userId = item[0]
//     // const item = likeRankItems[userId] 
//     item.setOrder(i) 
//   })
// }, 3000)


setInterval(function(){
   for(let userId in likeRankItems){
     likeRankItems[userId].score = 0;
   }
  console.log('reset')
}, 2*60*1000)
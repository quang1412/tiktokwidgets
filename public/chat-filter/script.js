let connection = new window.TikTokIOConnection();

// Counter
let viewerCount = 0;
let likeCount = 0;
let diamondsCount = 0;

// These settings are defined by obs.html
if (!window.settings) window.settings = {};

$(document).ready(() => {
  $('#connectButton').click(connect);
  $('#uniqueIdInput').on('keyup', function(e) {
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

function updateRoomStats() {
    $('#roomStats').html(`Viewers: <b>${viewerCount.toLocaleString()}</b> Likes: <b>${likeCount.toLocaleString()}</b> Earned Diamonds: <b>${diamondsCount.toLocaleString()}</b>`)
}
function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

connection.on('roomUser', (msg) => {
    if (typeof msg.viewerCount === 'number') {
        viewerCount = msg.viewerCount;
        updateRoomStats();
    }
})

connection.on('like', (msg) => {
    if (typeof msg.totalLikeCount === 'number') {
        likeCount = msg.totalLikeCount;
        updateRoomStats();
    }
})
connection.on('gift', (data) => {
    if (!isPendingStreak(data) && data.diamondCount > 0) {
        diamondsCount += (data.diamondCount * data.repeatCount);
        updateRoomStats();
    } 
})

////////////////////////////////////////////////////////////
// END BASIC ///////////////////////////////////////////////
////////////////////////////////////////////////////////////

$(document).ready(function() {
  const viewersInfo = JSON.parse(window.localStorage.viewersInfo || '{}')
  const commentsList = JSON.parse(window.localStorage.commentsList || '[]')
  
  function saveData(){
    try{      
      window.localStorage.setItem('viewersInfo', JSON.stringify(viewersInfo))
      window.localStorage.setItem('commentsList', JSON.stringify(commentsList))
      // window.localStorage.commentsList = JSON.stringify(commentsList)
    }
    catch(e){
      console.log(e.message)
    }
  }
  
  // $.fn.dataTable.ext.buttons.phoneFilter = {
  //     text: 'Cmt có sđt',
  //     action: function ( e, dt, node, config ) {
  //         dt.ajax.reload();
  //     }
  // };
  const table = new window.DataTable('#comment_list', {
    // dom: 'Bfrtip',
    // buttons: [
        // 'phoneFilter'
    // ],
    order: [0, 'desc'],
    columns: [
      {
        title:'Time',
        data: 'createTime',
        render: function ( data, type, row ) {
          const date = new Date(parseInt(data)).toLocaleDateString()
          const time = new Date(parseInt(data)).toLocaleTimeString()
          return `<p class="mb-0">${date} - ${time}</p>`
        },
      },
      {
        title: 'Avatar',
        data:'profilePictureUrl',
        render: function ( data, type, row ) {
          return `<img src="${data}" width="32" height="32" class="rounded-circle border border-3">`
          // return '$'+ data;
        },
        orderable: false
      },
      {
        title: 'Username',
        data: 'uniqueId'
      },
      {
        title: 'Nickname',
        data: 'nickname'
      },
      {
        title: 'Comment',
        data: 'comment'
      }
    ],
    data: commentsList
  });
  
  connection.on('chat', data => {
    viewersInfo[data.userId] = data
    
    const {uniqueId,comment} = data
    // console.log(`%c${uniqueId}`, 'color:red', comment)
    // console.log(data)
    commentsList.push(data)
    const node = table.rows.add([data]).draw();
  })

  setInterval(saveData, 3000)
})
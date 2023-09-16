let connection = new window.TikTokIOConnection();

let limitItemsCount = 10;

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
////////////////////////////////////////////////////////////
// END BASIC ///////////////////////////////////////////////
////////////////////////////////////////////////////////////

$(document).ready(function() {
  const viewersInfo = JSON.parse(window.localStorage.viewersInfo || '{}')
  const commentsList = JSON.parse(window.localStorage.commentsList || '[]')
  
  function saveViewsInfo(info){
    viewersInfo[info.userId] = info
  }
  
  // $.fn.dataTable.ext.buttons.phoneFilter = {
  //     text: 'Cmt có sđt',
  //     action: function ( e, dt, node, config ) {
  //         dt.ajax.reload();
  //     }
  // };
  const table = new window.DataTable('#example', {
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
    saveViewsInfo(data)
    
    const {uniqueId,comment} = data
    // console.log(`%c${uniqueId}`, 'color:red', comment)
    // console.log(data)
    commentsList.push(data)
    const node = table.rows.add([data]).draw();
  })

  setInterval(function() {
    try{      
      window.localStorage.setItem('commentsList', JSON.stringify(commentsList))
      // window.localStorage.commentsList = JSON.stringify(commentsList)
    }
    catch(e){
      console.log(e.message)
      if(e.message.includes('exceeded the quota')){
        let indexToRemove = 10;
        let numberToRemove = commentsList.length;

        commentsList.splice(indexToRemove, numberToRemove)
        window.localStorage.setItem('commentsList', JSON.stringify(commentsList))
      }
    }
  }, 3000)
})
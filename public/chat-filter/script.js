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
  const liveComments = JSON.parse(window.localStorage.liveComments || '[]')
  
  function saveData(){
    try{      
      window.localStorage.setItem('viewersInfo', JSON.stringify(viewersInfo))
      window.localStorage.setItem('liveComments', JSON.stringify(liveComments))
      // window.localStorage.liveComments = JSON.stringify(liveComments)
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
  $('#comment_list thead tr').clone(true).addClass('filters').appendTo( '#comment_list thead' );
  
  const table = new window.DataTable('#comment_list', {
    dom: 'Bfrtip',
        buttons: [
            'print'
        ],
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
        data:'userId',
        render: function ( id, type, row ) {
          return `<img src="${viewersInfo[id].profilePictureUrl}" width="32" height="32" class="rounded-circle border border-3">`
        },
        orderable: false
      },
      {
        title: 'Username',
        data: 'userId',
        render: function ( id, type, row ) {
          return viewersInfo[id].uniqueId
        }
      },
      {
        title: 'Nickname',
        data: 'userId',
        render: function ( id, type, row ) {
          return viewersInfo[id].nickname
        }
      },
      {
        title: 'Comment',
        data: 'comment'
      }
    ],
    data: liveComments,
    initComplete: function( settings ) {
        $('#comment_list_loader').hide()
        $('#comment_list thead tr').clone(true).addClass('filters').appendTo( '#comment_list thead' );
      
      var api = this.api();
            // For each column
      api.columns().eq(0).each(function(colIdx) {
          // Set the header cell to contain the input element
          var cell = $('.filters th').eq($(api.column(colIdx).header()).index()).removeClass('sorting sorting_desc sorting_disabled');
          var title = $(cell).text();
        
          if(title == "Avatar") {
            return $(cell).text(null)
          }
        
          $(cell).html( '<input class="form-control form-control-sm" type="text" placeholder="'+title+'" />' );
          // On every keypress in this input
          $('input', $('.filters th').eq($(api.column(colIdx).header()).index()) )
              .off('keyup change')
              .on('keyup change', function (e) {
                  e.stopPropagation();
                  // Get the search value
                  $(this).attr('title', $(this).val());
                  var regexr = '({search})'; //$(this).parents('th').find('select').val();
                  var cursorPosition = this.selectionStart;
                  // Search the column for that value
                  api
                      .column(colIdx)
                      .search((this.value != "") ? regexr.replace('{search}', '((('+this.value+')))') : "", this.value != "", this.value == "")
                      .draw();
                  $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
              })
              .click(function(){return false;});
      });
    }
  });
  
  connection.on('chat', d => { 
    const viewerData = {
      followInfo: d.followInfo,
      followRole: d.followRole,
      isModerator: d.isModerator,
      isNewGifter: d.isNewGifter,
      isSubscriber: d.isSubscriber,
      nickname: d.nickname,
      profilePictureUrl: d.profilePictureUrl, 
      uniqueId: d.uniqueId,
      userId: d.userId
    }
    
    viewersInfo[d.userId] = viewerData
    
    
    const msgData = {
      msgId: d.msgId,
      userId: d.userId,
      comment: d.comment,
      createTime: d.createTime,
    }
    liveComments.push(msgData)
    const node = table.rows.add([msgData]).draw();
  })

  setInterval(saveData, 3000)
})
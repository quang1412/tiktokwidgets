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
  $('#stateText').text('Livestream đã kết thúc.');
  
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

    $('#stateText').text('Đang kết nối...');

    connection.connect(uniqueId, {
      enableExtendedGiftInfo: true
    }).then(state => {
      $('#stateText').text(`Đã kết nối tới livestream id ${state.roomId}`);
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
    $('#roomStats').html(`Mắt xem: <b>${viewerCount.toLocaleString()}</b> Thả tim: <b>${likeCount.toLocaleString()}</b> Kim cương: <b>${diamondsCount.toLocaleString()}</b>`)
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


$(document).ready(() => $("input#uniqueIdInput").val(window.localStorage.uniqueId))

////////////////////////////////////////////////////////////
// END BASIC ///////////////////////////////////////////////
////////////////////////////////////////////////////////////

$(document).ready(function() {
  var viewersInfo = JSON.parse(window.localStorage.viewersInfo || '{}')
  var liveComments = JSON.parse(window.localStorage.liveComments || '[]')
  
  const minEl = document.querySelector('#fromDate');
  const maxEl = document.querySelector('#toDate');
  
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
  window.DataTable.ext.search.push(function (settings, data, dataIndex) {
    
      let min = parseInt((new Date(minEl.value).getTime()), 10)

      let max = parseInt((new Date(maxEl.value).getTime()), 10)

      let age = parseFloat(data[3]) || 0; // use data for the age column

      if (
          (isNaN(min) && isNaN(max)) ||
          (isNaN(min) && age <= max) ||
          (min <= age && isNaN(max)) ||
          (min <= age && age <= max)
      ) {
          return true;
      }

      return false;
  });
  
  const table = new window.DataTable('#comment_list', {
    // dom: '<B>lfrtip',
    dom: '<"d-flex flex-column flex-md-row justify-content-between" <B><f>> rt <"d-flex flex-column flex-xl-row flex-wrap flex-xl-nowrap justify-content-between align-items-center align-items-xl-end" <l> <i> <p> >',
    buttons: [
      {
          extend: 'excel',
          text: '<i class="fa-solid fa-file-excel me-1"></i> xuất excel', 
          exportOptions: {
              columns: [0, 4, 5, 2]
          },
      },
      {
          extend: 'pdf',
          text: '<i class="fa-solid fa-file-pdf me-1"></i> xuất pdf', 
          exportOptions: {
              columns: [0, 4, 5, 2]
          },
      },
      {
          extend: 'print',
          text: '<i class="fa-solid fa-print me-1"></i> in nhãn dán',
          exportOptions: {
              columns: [ -1]
          },
          autoPrint: true,
          customize: function ( win ) {  
            $.each($(win.document.body).find( 'td' ), (i, e) => {
                e.innerHTML = e.innerText.replaceAll('\\n','<br class="d-none d-print-block">')
            });
          }
      },
      {
          text: '<i class="fa-solid fa-trash"></i> xoá dữ liệu',
          action: function ( e, dt, node, config ) {
            if (confirm("Bạn có chắc chắn muốn xoá sạch dữ liệu?")){
              window.localStorage.clear();
              viewersInfo = JSON.parse(window.localStorage.viewersInfo || '{}')
              liveComments = JSON.parse(window.localStorage.liveComments || '[]')
              window.location.reload()
            }
          },
          className:'bg-danger border-danger'
      }
    ],
    columnDefs: [
    { "visible": false, "targets": -1 },
    { "visible": false, "targets": -2 },
    { "visible": false, "targets": -3 },
    { "visible": false, "targets": -4 },
  ],
    order: [0, 'desc'],
    fixedHeader: true,
    columns: [
      
      {
        title:'Thời gian',
        data: 'createTime',
        render: function ( data, type, row ) {
          const date = new Date(parseInt(data)).toLocaleDateString()
          const time = new Date(parseInt(data)).toLocaleTimeString()
          // return `<span class="d-none">${data}</span>`
          return `<p class="mb-0">${date}&nbsp</p><p class="mb-0">${time}</p>`
        },
        orderable: false
      },
      {
        title: 'Người xem',
        data:'userId',
        render: function ( id, type, row ) {
          const avt = `<img src="${viewersInfo[id].profilePictureUrl}" width="40" height="40" class="rounded-circle border border-3">`
          const userName = viewersInfo[id].uniqueId
          const nickName = viewersInfo[id].nickname
          // return avt
          return `<a class="d-flex gap-1 text-decoration-none text-nowrap" href="https://tiktok.com/@${userName}" target="_blank">${avt}<div class="lh-1 d-flex flex-column"><pre class="order-2 text-muted mb-0 mt-1">@${userName}&nbsp</pre><span class="fw-bold">${nickName}&nbsp</span></div></a>`
        },
        orderable: false
      },
      {
        title: 'Comment',
        data: 'comment',
        render: function ( text, type, row ) {
          return text || ''
        },
        orderable: false
      },
      {
        title: 'Timestamp',
        data: 'createTime',
      },
      {
        title: 'Username',
        data: 'userId',
        render: function ( id, type, row ) {
          const uniqueId = viewersInfo[id].uniqueId;
          return '@'+uniqueId
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
        title: 'Nhãn in',
        data: 'userId',
        render: function ( userId, type, row ) {
          const createTime = row.createTime
          const date = new Date(parseInt(createTime)).toLocaleDateString()
          const time = new Date(parseInt(createTime)).toLocaleTimeString()
          
          const userName = viewersInfo[userId].uniqueId
          const nickName = viewersInfo[userId].nickname
          return `${date} ${time} \\n ${nickName} \\n @${userName} \\n\\n ${row.comment}`
        },
        orderable: false
      },
    ],
    data: liveComments,
    initComplete: function( settings ) {
      $('#comment_list_loader').hide()
      return
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
        
          $(cell).html( '<input class="form-control" type="text" placeholder="'+title+'" />' );
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
              .click(function(e){return false;});
      });
    }
  });
  
  
  minEl.addEventListener('change', function () {
    table.draw();
  });
  maxEl.addEventListener('change', function () {
    table.draw();
  });
  
  connection.on('chat', d => { 
    const {comment} = d
    if(!comment || !comment.trim()) return
    
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
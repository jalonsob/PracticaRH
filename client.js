
var localvideo = document.getElementById('localVideo');
var remotevideo = document.getElementById('remoteVideo');

var constraints = window.constraints = {
  audio: false,
  video: {
    width: {max: 320},
    height: {max: 320},
  }
};

var errorElement = document.querySelector('#errorMsg');

var room;
var me;
var first = false;
var vecino;


var ballangley = 0.01*Math.random();
var ballsumy=Math.random() < 0.5 ? -1 : 1;;
var ballanglex = 0.01*Math.random();
var ballsumx=Math.random() < 0.5 ? -1 : 1;;

var rak1angley = 0.00;
var rak1anglex = 1.00;
var rak2angley = 0.00;
var rak2anglex = -1.00;

$(function() {
  $("#join").click(onJoin);
  $("#send").click(onSend);
  $('#inputchat').keypress(onEnter);
  $("#connect").click(onConnect);
  $("#exit").click(onExit);

  $("#join").show();
  $("#connect").hide();
  $("#exit").hide();
  $("#user").show();
  $("#room").show();
});

function onJoin(){
  getUserData();
  preparePeerConnection();
  sendRoom();
  $("#join").hide();
  $("#connect").hide();
  $("#exit").show();
  $("#user").hide();
  $("#room").hide();
  getUserMedia();
}

function getUserData(){
  me = $("#user")[0].value;
  room = $("#room")[0].value;
}

function preparePeerConnection(){
  var config = null;
  window.localconnection = new RTCPeerConnection(config);

  localconnection.onicecandidate = handleIceCandidate;
  localconnection.onaddstream = gotRemoteStream;
  localconnection.ondatachannel = onDataChannel;

  window.localDataChannel = localconnection.createDataChannel(null);
  localDataChannel.onopen = onOpen;
  localDataChannel.onclose = onClose;
}

function gotRemoteStream(event){
  remotevideo.srcObject = event.stream;
  initWebGL()
}

function handleIceCandidate(event){
  if(event.candidate){
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  }
}

function gotLocalDescriptionAndSend(description){
  localconnection.setLocalDescription(description)
  .catch(handleError);
  sendMessage(description);
}

function onDataChannel(event){
  window.remoteDataChannel = event.channel;
  remoteDataChannel.onmessage = onMessage;
}


function onSend(){
  var message = $("#inputchat")[0].value;
  $("#inputchat")[0].value = "";
  $("#chat").append(me+": "+message+"\n");
  scrolldown("chat");
  if (message==""){
    message=" "
  }
  localDataChannel.send(message);
}

function onMessage(event){
  $("#chat").append(usuario+": "+event.data+"\n");
  scrolldown("chat");
}

function onEnter(e){
  if(e.which == 13) {
    $('#send').focus().click();
  }
}

function sendRoom(){
  var aux = {
    room: room,
    user: me
  };
  socket.emit('join', JSON.stringify(aux));
}

function doAnswer(){
  localconnection.createAnswer(null)
  .then(gotLocalDescriptionAndSend)
  .catch(handleError);
}

function getUserMedia(){
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
    var videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log('Using video device: ' + videoTracks[0].label);
    stream.onended = function() {
      console.log('Stream ended');
    };
    window.stream = stream;
    localvideo.srcObject = stream;
    localconnection.addStream(stream);
  })
  .catch(function(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      errorMsg('The resolution ' + constraints.video.width.exact + 'x' +
          constraints.video.width.exact + ' px is not supported by meur device.');
    } else if (error.name === 'PermissionDeniedError') {
      errorMsg('Permissions have not been granted to use meur camera and ' +
        'microphone, meu need to allow the page access to meur devices in ' +
        'order for the demo to work.');
    }
    errorMsg('getUserMedia error: ' + error.name, error);
  });
}

function onOpen(){
  console.log("Abro localDataChannel");
}

function onClose(){
  console.log("Cierro localDataChannel");
}

function onConnect(){
  localconnection.createOffer(null)
  .then(gotLocalDescriptionAndSend)
  .catch(handleError);
  $("#join").hide();
  $("#connect").hide();
  $("#exit").show();
  $("#user").hide();
  $("#room").hide();
}

function onExit(){
  window.stream.getVideoTracks().forEach(function(closeTrack){
    closeTrack.stop();
  });

  socket.emit('bye', room);
  localconnection.close();

  $("#join").show();
  $("#connect").hide();
  $("#exit").hide();
  $("#user").show();
  $("#room").show();

}

function errorMsg(msg, error) {
  errorElement.innerHTML += '<p>' + msg + '</p>';
  if (typeof error !== 'undefined') {
    console.log(error);
  }
}

function scrolldown(element){
  document.getElementById(element).scrollTop = document.getElementById(element).scrollHeight 
}

function handleError(error){
  console.log(error)
}

function sendMessage(sms){
  socket.emit('message', sms);
}

var socket = io.connect();

socket.on('message', function (sms){
  switch(sms.type) {
    case 'offer':
      localconnection.setRemoteDescription(new RTCSessionDescription(sms));
      doAnswer();
      break;
    case 'answer':
      localconnection.setRemoteDescription(new RTCSessionDescription(sms));
      break;
    case 'candidate':
      var candidate = new RTCIceCandidate({
        sdpMLineIndex:sms.label,
        candidate:sms.candidate
      });
      localconnection.addIceCandidate(candidate);
      break;
    default:
  }
});

socket.on('joined', function(message){
  var aux = JSON.parse(message);
  if (aux.first){
    first=true;
  }else if(first){
    $("#join").hide();
    $("#connect").show();
    $("#exit").show();
    $("#user").hide();
    $("#room").hide();
    usuario = aux.usuario2;
    $("#chat").append(usuario+" connected.\n");
  }else{
    usuario = aux.usuario1;
    $("#chat").append("Te has unido a la room "+room+" con el usuario "+usuario+"\n");
  }
  scrolldown("chat");
});


socket.on('full', function(message){
  $("#chat").append("servidor: La sala está llena\n");
  scrolldown("chat");

  $("#join").show();
  $("#connect").hide();
  $("#exit").hide();
  $("#user").show();
  $("#room").show();
});

socket.on('bye', function (){
  window.stream.getVideoTracks().forEach(function(closeTrack){
    closeTrack.stop();
  });
  try{
    localconnection.close()
  }catch(error){
    console.log(error)
  };

  $("#join").show();
  $("#connect").hide();
  $("#exit").hide();
  $("#user").show();
  $("#room").show();

})

socket.on('ballsend',function(ball){
  var aux = JSON.parse(ball);
  ballangley = aux.ballangley;
  ballanglex = aux.ballanglex;
})

socket.on('racketsend',function(rack){
  if(first){
    rak2angley = rack;
  }else{
    rak1angley = rack;
  }
})

var express = require('express');
var app = express();
var http = require('http').Server(app);
io = require('socket.io').listen(http);
var rooms = {
  "1":{
    "nusers":0,
    "user1":"",
    "user2":""
  },
  "2":{
    "nusers":0,
    "user1":"",
    "user2":""
  },
  "3":{
    "nusers":0,
    "user1":"",
    "user2":""
  },
  "4":{
    "nusers":0,
    "user1":"",
    "user2":""
  }
}
app.use(express.static('.'));

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.sockets.on('connection', function(socket) {

  socket.on('message', function(message) {
    socket.broadcast.emit('message', message);
  });

  socket.on('bye', function(sala) {
    rooms[sala]["nusers"] = 0
    rooms[sala]["user1"] = "";
    rooms[sala]["user2"] = "";
    io.sockets.in(sala).emit('bye', sala);
  });

  socket.on('join', function(message) {
    var json = JSON.parse(message);
    var room = json.room;

    var numClients = rooms[room]["nusers"]
    console.log(numClients)
    if (numClients === 0) {
      socket.join(room);
      rooms[room]["nusers"] = 1
      rooms[room]["user1"] = json.user;
      var cnt = {
        first: true
      }
      socket.emit('joined', JSON.stringify(cnt));
    } else if (numClients === 1) {
      socket.join(room);
      rooms[room]["nusers"] = 2
      rooms[room]["user2"] = json.user;
      var cnt = {
        usuario1: rooms[room]["user1"],
        usuario2: rooms[room]["user2"]
      }
      io.sockets.in(room).emit('joined', JSON.stringify(cnt));
    } else { 
      socket.emit('full', room);
    }
  });

  socket.on('ball',function(ball){
    socket.broadcast.emit('ballsend', ball);
  })

  socket.on('racket',function(rack){
    socket.broadcast.emit('racketsend', rack);
  })

});

var util = require('util')
var http = require('http')
var path = require('path')
var ecstatic = require('ecstatic')
var io = require('socket.io')

var Player = require('./Player')
var score = 0;
var win = 50000;

var port = process.env.PORT || 8080

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket	// Socket controller
var players	// Array of connected players

/* ************************************************
** GAME INITIALISATION
************************************************ */

// Create and start the http server
var server = http.createServer(
  ecstatic({ root: path.resolve(__dirname, '../public') })
).listen(port, function (err) {
  if (err) {
    throw err
  }

  init()
})

function init () {
  // Create an empty array to store players
  players = []

  // Attach Socket.IO to server
  socket = io.listen(server)

  // Start listening for events
  setEventHandlers()
}

/* ************************************************
** GAME EVENT HANDLERS
************************************************ */
var setEventHandlers = function () {
  // Socket.IO
  socket.sockets.on('connection', onSocketConnection)
}

// New socket connection
function onSocketConnection (client) {
  console.log('New player has connected: ' + client.id)

  client.on("test", test);

  client.on("start!", start);

  // Listen for client disconnected
  client.on('disconnect', onClientDisconnect)

  // Listen for new player message
  client.on('new player', onNewPlayer)

  client.on('score', onScore);

  // Listen for move player message
  client.on('move player', onMovePlayer)

  client.on("attack", onattack);

  client.on("restart", restart);
}

// Socket client has disconnected
function onClientDisconnect () {
  util.log('Player has disconnected: ' + this.id)

  var removePlayer = playerById(this.id)

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Remove player from players array
  players.splice(players.indexOf(removePlayer), 1)

  // Broadcast removed player to connected socket clients
  this.broadcast.emit('remove player', {id: this.id})
}

// New player has joined
function onNewPlayer (data) {
  // Create a new player
  var newPlayer = new Player(data.x, data.y, data.pType, data.hostid);
  newPlayer.id = this.id

  // Broadcast new player to connected socket clients
  this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), pType: newPlayer.pType, hostid: newPlayer.hostid})

  // Send existing players to the new player
  var i, existingPlayer
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i]
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), pType: existingPlayer.pType, hostid: existingPlayer.hostid})
  }

  // Add new player to the players array
  players.push(newPlayer)
}

// Player has moved
function onMovePlayer (data) {
  // Find player in array
  var movePlayer = playerById(this.id)

  // Player not found
  if (!movePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Update player position
  movePlayer.setX(data.x)
  movePlayer.setY(data.y)

  // Broadcast updated position to connected socket clients
  this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()})
}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
// Find player by ID
function playerById (id) {
  var i
  for (i = 0; i < players.length; i++) {
    if (players[i].id === id) {
      return players[i]
    }
  }

  return false
}

var inte;

var wowe;

function onScore(n, x, y, spr){
  score += n;
  this.broadcast.emit("proScore", score, win, x, y, spr);
  console.log(x, y, spr);
}

function onattack(id){
  this.broadcast.emit("damage", id);
}

function test(e){
  if(score >= win){
    this.broadcast.emit("tst", true);
  }
}

function restart(e){
  score = e;
  console.log("retetting");
  this.broadcast.emit("proScore", score, win);
}

var jade;

function start(){
  this.broadcast.emit("start");
  score = 0;
  jade = this;
}

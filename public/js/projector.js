/* global Phaser RemotePlayer io */

var game = new Phaser.Game(2000, 2000, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render })

function preload () {
  game.load.image('earth', 'assets/light_sand.png')
  game.load.spritesheet('dude', 'assets/dude.png', 24, 16, 3)
  game.load.spritesheet('enemy', 'assets/dude.png', 24, 16, 3)
  game.load.image('castle', 'assets/Castle.png');
  game.load.image('damage', 'assets/damage.png');
  game.load.image('heal', 'assets/heal.png');
  game.load.image('dust', 'assets/explosion.png');
  game.load.spritesheet('guard', 'assets/Guards.png', 27, 16, 3)
}

function bind(obj, property, domElem) {
  Object.defineProperty(obj, property, {
    get: function() { return domElem.innerHTML; },
    set: function(newValue) { domElem.innerHTML = newValue; },
    configurable: true
  });
}

var socket; // Socket connection

var land;

var test;

var winBox;

var player;

var enemies;
var castle;

var currentSpeed = 0;
var cursors;

var players = {
  en: 0,
  st: 0,
};

$(function(){
  $("#myModal").modal({
    backdrop: "static",
    keyboard: false,
    show: false,
  });
  $("#createModal").modal({
    backdrop: "static",
    keyboard: false,
    show: false,
  })
  $("#createModal").modal("show");
  bind(players, "en", document.querySelector(".en"));
  bind(players, "st", document.querySelector(".st"));
});

function start(){
  $("#createModal").modal("hide");
  socket.emit("start!");
}

function create () {
  socket = io.connect()

  // Resize our game world to be a 2000 x 2000 square
  game.world.setBounds(-500, -500, 1000, 1000)

  // Our tiled scrolling background
  land = game.add.tileSprite(0, 0, 2000, 2000, 'earth')
  land.fixedToCamera = true
  castle = game.add.sprite(-500, -500, 'castle');
  castle.scale.set(1, 1);

  dust = game.add.sprite(-10000, -20, "dust");
  winBox = new Phaser.Rectangle(0, 0, 500, 500);

  // The base of our player
  /*
  var startX = Math.round(Math.random() * (1000) - 500)
  var startY = Math.round(Math.random() * (1000) - 500)
  player = game.add.sprite(startX, startY, 'dude')
  player.anchor.setTo(0.5, 0.5)
  player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true)
  player.animations.add('stop', [3], 20, true)

  // This will force it to decelerate and limit its speed
  // player.body.drag.setTo(200, 200)
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.maxVelocity.setTo(400, 400)
  player.body.collideWorldBounds = true

  // Create some baddies to waste :)
  */
  enemies = []
  /*
  player.bringToTop()

  game.camera.follow(player)
  game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300)
  game.camera.focusOnXY(0, 0)

  cursors = game.input.keyboard.createCursorKeys()

  // Start listening for events
  */
  setEventHandlers()
}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected)

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect)

  // New player message received
  socket.on('new player', onNewPlayer)

  // Player move message received
  socket.on('move player', onMovePlayer)

  // Player removed message received
  socket.on('remove player', onRemovePlayer)

  socket.on("proScore", onScore);

  socket.on("caw!", win);

  test = window.setInterval(function(){
    socket.emit("test", 1);
  }, 1000);

  console.log("hai");
  socket.emit("restart", 0);
}

// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server')

  // Reset enemies on reconnect
  enemies.forEach(function (enemy) {
    enemy.player.kill()
  })
  enemies = []

  // Send local player data to the game server
  //socket.emit('new player', { x: player.x, y: player.y })
}

// Socket disconnected
function onSocketDisconnect () {
  console.info('Disconnected from socket server')
}

// New player
function onNewPlayer (data) {
  console.info('New player connected:', data.id)

  // Avoid possible duplicate players
  var duplicate = playerById(data.id)
  if (duplicate) {
    console.info('Duplicate player!')
    return
  }

  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.pType))
}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id)

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  // Update player position
  movePlayer.player.x = data.x
  movePlayer.player.y = data.y
}

// Remove player
function onRemovePlayer (data) {
  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id)
    return
  }
  if(removePlayer.player.pType == "guard"){
    players.en --;
  }
  else{
    players.st --;
  }
  removePlayer.player.kill();

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1)
}

function update () {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) {
      enemies[i].update()
      game.physics.arcade.collide(player, enemies[i].player)
    }
  }
  if(hasWon){
    if(winBox.height >= 0){
      if(castle.x == -500){
        castle.x = -498;
      }
      else{
        castle.x = -500;
      }
      castle.crop(winBox);
      castle.y++;
      winBox.height--;
      dust.x = -550;
      dust.bringToTop();
    }
    else{
      dust.x = -10000;
      hasWon = false;
    }
  }
/*
  if (cursors.left.isDown) {
    player.angle -= 4
  } else if (cursors.right.isDown) {
    player.angle += 4
  }

  if (cursors.up.isDown) {
    // The speed we'll travel at
    currentSpeed = 300
  } else {
    if (currentSpeed > 0) {
      currentSpeed -= 4
    }
  }
  */
/*
  game.physics.arcade.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity)

  if (currentSpeed > 0) {
    player.animations.play('move')
  } else {
    player.animations.play('stop')
  }

  Hello, fuckers of HWH Block 4!

  land.tilePosition.x = -game.camera.x
  land.tilePosition.y = -game.camera.y

  if (game.input.activePointer.isDown) {
    if (game.physics.arcade.distanceToPointer(player) >= 10) {
      currentSpeed = 300

      player.rotation = game.physics.arcade.angleToPointer(player)
    }
  }

  socket.emit('move player', { x: player.x, y: player.y })
  */
}

function render () {

}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].player.name === id) {
      return enemies[i]
    }
  }

  return false
}

var d = [];

function onScore(score, win, x, y, spr){
  $("#damage")[0].value = score;
  d.push(game.add.sprite(x, y, spr));
  window.setTimeout(function(){
    var k = d.shift();
    k.kill();
    console.log("killing!");
  }, 200);
  if(score >= win){
    hasWon = true;
    $("#myModal").modal("show");
  }
}

var hasWon = false;

function win(){
  console.log("caw!")
  hasWon = true;
  $("#myModal").modal("show");
}

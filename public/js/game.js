/* global Phaser RemotePlayer io */

var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload () {
  game.load.image('earth', 'assets/light_sand.png')
  game.load.image('castle', 'assets/Castle.png');
  game.load.image('dust', 'assets/explosion.png');
  game.load.spritesheet('dude', 'assets/dude.png', 24, 16, 3);
  game.load.spritesheet('enemy', 'assets/dude.png', 24, 16, 3);
  game.load.spritesheet('guard', 'assets/Guards.png', 27, 16, 3);
}

var socket; // Socket connection

var land;

var player;

var enemies;

var pTY = function(){
  var c = chance.integer({min: 1, max: 10});
  if(c >= 9){
    return("guard");
  }
  else{
    return("stormer");
  }
}();

var id = chance.integer();

var guards;

var castle;

var currentSpeed = 0;
var cursors;
var winBox;

$(function(){
  document.querySelector("#damage").style.left = String(($(window).width() / 2) - 400) + "px";
  $("#myModal").modal({
    backdrop: "static",
    keyboard: false,
    show: false,
  });
  $("#createModal").modal({
    backdrop: "static",
    keyboard: false,
    show: false,
  });
  $("#createModal").modal("show");
});

function create () {
  socket = io.connect()

  // Resize our game world to be a 2000 x 2000 square
  game.world.setBounds(-500, -500, 1000, 1000)

  // Our tiled scrolling background
  land = game.add.tileSprite(0, 0, 800, 600, 'earth')
  land.fixedToCamera = true

  // The base of our player
  var startX = Math.round(Math.random() * (1000) - 500)
  var startY = Math.round(Math.random() * (1000) - 500)

  if(pTY == "stormer"){
    player = game.add.sprite(startX, startY, 'dude')
    player.pType = "stormer";
  }
  else if(pTY == "guard"){
    player = game.add.sprite(startX, startY, 'guard');
    player.pType = "guard";
  }
  else{
    player = game.add.sprite(startX, startY, 'dude')
  }
  player.animations.add('move', [0, 1, 2], 20, true);
  player.animations.add('stop', [1], 20, true);

  player.anchor.setTo(0.5, 0.5)
  dust = game.add.sprite(-10000, -20, "dust");

  castle = game.add.sprite(-500, -500, 'castle');
  game.physics.enable(castle, Phaser.Physics.ARCADE);
  castle.body.immovable = true;
  castle.scale.set(1, 1);

  // This will force it to decelerate and limit its speed
  // player.body.drag.setTo(200, 200)
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.maxVelocity.setTo(400, 400)
  player.body.collideWorldBounds = true

  winBox = new Phaser.Rectangle(0, 0, 500, 500);

  // Create some baddies to waste :)
  enemies = [];

  player.bringToTop()

  game.camera.follow(player)
  game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300)
  game.camera.focusOnXY(0, 0)

  cursors = game.input.keyboard.createCursorKeys();

  // Start listening for events
  console.log(player);
  setEventHandlers()
}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected);

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect);

  socket.on("start", start);

  // WINNING!
  socket.on("caw!", win);

  socket.on("tst", test);

  // New player message received
  socket.on('new player', onNewPlayer);

  // score
  socket.on("proScore", ss);

  // Player move message received
  socket.on('move player', onMovePlayer);

  // Player removed message received
  socket.on('remove player', onRemovePlayer);

  socket.on("damage", function(id1){
    if(id1 == id){
      damage();
    }
  });
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
  socket.emit('new player', { x: player.x, y: player.y, pType: player.pType, hostid: id })
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server')
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id)

  // Avoid possible duplicate players
  var duplicate = playerById(data.id)
  if (duplicate) {
    console.log('Duplicate player!')
    return
  }
  console.log(data);
  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.pType, data.hostid))
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
  var removePlayer = playerById(data.id)

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  removePlayer.player.kill()

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1)
}

function update () {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) {
      enemies[i].update();
      if(player.pType == "stormer" && enemies[i].player.pType == "guard"){
        game.physics.arcade.collide(player, enemies[i].player, damage);
      }
      else/*(player.pType == "guard" && enemies[i].player.pType == "stormer")*/{
        game.physics.arcade.collide(player, enemies[i].player, function(){
          console.log("hey" + enemies[i].player.hostid);
          socket.emit("attack", enemies[i].player.hostid);
        });
      }
    }
  }

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

  game.physics.arcade.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity)

  if (currentSpeed > 0) {
    player.animations.play('move')
  } else {
    player.animations.play('stop')
  }

  land.tilePosition.x = -game.camera.x
  land.tilePosition.y = -game.camera.y

  if (game.input.activePointer.isDown) {
    if (game.physics.arcade.distanceToPointer(player) >= 10) {
      currentSpeed = 300

      player.rotation = game.physics.arcade.angleToPointer(player)
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
    }
  }
  else{
    game.physics.arcade.collide(player, castle, score);
  }
  socket.emit('move player', { x: player.x, y: player.y })
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

var health = 200;

function damage(){
  health--;
  if(health <= 0){
    health = 200;
    player.x = 750;
    player.y = 750;
  }
  $("#damage")[0].value = health;
}

function score() {
  if(player.pType == "stormer"){
    s += 3;
  }
  if(player.pType == "guard"){
    s--;
  }
}

var s = 0;

var i = window.setInterval(function(){
  socket.emit("score", s);
  if(s != 0){
    console.info("sending " + s);
  }
  s = 0;
}, 1000)

var hasWon = false;
var dust;

function win(){
  hasWon = true;
  console.log("caw!");
  $("#myModal").modal("show");
}

function ss(score){
  console.log(score);
}

function test(e){
  if(e){
    hasWon = true;
    console.log("got it");
    $("#myModal").modal("show");
  }
}

function start(){
  $("#createModal").modal("hide");
}

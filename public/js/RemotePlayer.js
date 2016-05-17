/* global game */

var RemotePlayer = function (index, game, player, startX, startY, pType1, hostid) {
  var x = startX
  var y = startY

  this.game = game
  this.health = 3
  this.player = player
  this.alive = true

  if(pType1 == "stormer"){
    this.player = game.add.sprite(x, y, 'enemy')
    this.player.pType = "stormer";
    players.st ++;
    console.warn("A stormer connected!");
  }
  else if(pType1 == "guard"){
    this.player = game.add.sprite(startX, startY, 'guard');
    this.player.pType = "guard";
    players.es ++;
    console.warn("A guard connected!");
  }
  else{
    this.player = game.add.sprite(startX, startY, 'dude')
    console.warn("Something didn't work");
  }
  this.player.animations.add('move', [0, 1, 2], 20, true);
  this.player.animations.add('stop', [1], 20, true);

  this.player.anchor.setTo(0.5, 0.5)

  this.player.name = index.toString()
  game.physics.enable(this.player, Phaser.Physics.ARCADE)
  this.player.body.immovable = true
  this.player.body.collideWorldBounds = true

  this.player.angle = game.rnd.angle()
  this.player.hostid = hostid;
  console.log(this.player.hostid);

  this.lastPosition = { x: x, y: y }
}

RemotePlayer.prototype.update = function () {
  if (this.player.x !== this.lastPosition.x || this.player.y !== this.lastPosition.y) {
    this.player.play('move')
    this.player.rotation = Math.PI + game.physics.arcade.angleToXY(this.player, this.lastPosition.x, this.lastPosition.y)
  } else {
    this.player.play('stop')
  }

  this.lastPosition.x = this.player.x
  this.lastPosition.y = this.player.y
}

window.RemotePlayer = RemotePlayer

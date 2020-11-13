// Classes for point and size
function Point(x, y) {
  this.x = (x) ? parseFloat(x) : 0.0;
  this.y = (y) ? parseFloat(y) : 0.0;
}

function Size(w, h) {
  this.w = (w) ? parseFloat(w) : 0.0;
  this.h = (h) ? parseFloat(h) : 0.0;
}


// Enum types
var motionType = {
  NONE: 0,
  LEFT: 1,
  RIGHT: 2
}; // Motion enum

var facingType = {
  LEFT: 0,
  RIGHT: 1
};


// Constants
var GAME_INTERVAL = 25; // Time interval of running the game
var SCREEN_SIZE = new Size(600, 560); // Size of the game screen

var PLAYER_SIZE = new Size(40, 40); // Size of the player
var PLAYER_INIT_POS = new Point(0, 0); // Initial position of the player
var MOVE_DISPLACEMENT = 5; // Speed of the player in motion
var JUMP_SPEED = 15; // Speed of the player jumping
var VERTICAL_DISPLACEMENT = 1; // Displacement of vertical speed
var SHOOT_INTERVAL = 200.0; // The period when shooting is disabled

var NUM_MONSTERS = 6; // Number of monsters
var MONSTER_SIZE = new Size(40, 40); // Size of a monster
var MONSTER_SPEED = 1.0; // Speed of monsters
var MONSTER_DISTANCE = 120; // Minimum initial distance of monsters from the player

var BULLET_SIZE = new Size(10, 10); // Size of a bullet
var BULLET_SPEED = 10.0; // Speed of a bullet

var NUM_GOOD_THINGS = 8; // Number of good things


// Variables
var gameInterval = null; // Game interval
var countDownInterval = null; // Countdown interval
var zoom = 1.0; // Zoom level of the screen
var time_left = 60; // Amount of time left in seconds

var player = null; // Player object
var canShoot = true; // Whether the player can shoot a bullet
var bullets_left = 8; // Number of bullets left


// Helper function for checking intersection between two rectangles
function intersect(pos1, size1, pos2, size2) {
  return (pos1.x < pos2.x + size2.w && pos1.x + size1.w > pos2.x &&
    pos1.y < pos2.y + size2.h && pos1.y + size1.h > pos2.y);
}


// Player class
function Player(name) {
  this.node = document.getElementById("player");
  this.node_no_name = document.getElementById("playerwithoutname");
  this.position = PLAYER_INIT_POS;
  this.motion = motionType.NONE;
  this.verticalSpeed = 0;
  this.facing = facingType.RIGHT;
  this.name = (name == "") ? "Anonymous" : name;
  document.getElementById("nametag").textContent = this.name;
}

Player.prototype.isOnPlatform = function() {
  var platforms = document.getElementById("platforms");
  for (var i = 0; i < platforms.childNodes.length; i++) {
    var node = platforms.childNodes.item(i);
    if (node.nodeName != "rect") continue;

    var x = parseFloat(node.getAttribute("x"));
    var y = parseFloat(node.getAttribute("y"));
    var w = parseFloat(node.getAttribute("width"));
    var h = parseFloat(node.getAttribute("height"));

    if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
        ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
        (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
      this.position.y + PLAYER_SIZE.h == y) return true;
  }
  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) return true;

  return false;
}

Player.prototype.collidePlatform = function(position) {
  var platforms = document.getElementById("platforms");
  for (var i = 0; i < platforms.childNodes.length; i++) {
    var node = platforms.childNodes.item(i);
    if (node.nodeName != "rect") continue;

    var x = parseFloat(node.getAttribute("x"));
    var y = parseFloat(node.getAttribute("y"));
    var w = parseFloat(node.getAttribute("width"));
    var h = parseFloat(node.getAttribute("height"));
    var pos = new Point(x, y);
    var size = new Size(w, h);

    if (intersect(position, PLAYER_SIZE, pos, size)) {
      position.x = this.position.x;
      if (intersect(position, PLAYER_SIZE, pos, size)) {
        if (this.position.y >= y + h)
          position.y = y + h;
        else
          position.y = y - PLAYER_SIZE.h;
        this.verticalSpeed = 0;
      }
    }
  }
}

Player.prototype.collideScreen = function(position) {
  if (position.x < 0) position.x = 0;
  if (position.x + PLAYER_SIZE.w > SCREEN_SIZE.w) position.x = SCREEN_SIZE.w - PLAYER_SIZE.w;
  if (position.y < 0) {
    position.y = 0;
    this.verticalSpeed = 0;
  }
  if (position.y + PLAYER_SIZE.h > SCREEN_SIZE.h) {
    position.y = SCREEN_SIZE.h - PLAYER_SIZE.h;
    this.verticalSpeed = 0;
  }
}

// Generates random integer from vmin to vmax - 1
function rng(vmin, vmax) {
  return vmin + Math.floor((vmax - vmin) * Math.random());
}

// Executed after the page is loaded
function load(player_name) {
  // Attach keyboard events
  document.addEventListener("keydown", keydown, false);
  document.addEventListener("keyup", keyup, false);

  // Create the player
  player = new Player(player_name);

  // Create the monsters
  for (i = 0; i < NUM_MONSTERS; i++) {
    createMonster(i == 0);
  }

  for (i = 0; i < NUM_GOOD_THINGS; i++) {
    createGoodThing();
  }

  // Start the game interval
  gameInterval = setInterval("gamePlay()", GAME_INTERVAL);
}

// Create a monster
function createMonster(shootable) {
  var startx = Math.floor(rng(0, SCREEN_SIZE.w - MONSTER_SIZE.w));
  var starty = Math.floor(rng(MONSTER_DISTANCE, SCREEN_SIZE.h - MONSTER_SIZE.h));
  var endx = Math.floor(rng(MONSTER_DISTANCE, SCREEN_SIZE.w - MONSTER_SIZE.w));

  var monster = document.createElementNS("http://www.w3.org/2000/svg", "use");
  monster.shootable = shootable;
  monster.setAttribute("initx", startx);
  monster.setAttribute("x", startx);
  monster.setAttribute("y", starty);
  monster.setAttribute("endx", endx);
  monster.setAttribute("direction", facingType.RIGHT)
  monster.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#monster");
  document.getElementById("monsters").appendChild(monster);
}

// Create a good thing
function createGoodThing() {
  var x = Math.floor(rng(0, SCREEN_SIZE.w - MONSTER_SIZE.w));
  var y = Math.floor(rng(0, SCREEN_SIZE.h - MONSTER_SIZE.h));

  var goodThing = document.createElementNS("http://www.w3.org/2000/svg", "use");
  goodThing.setAttribute("x", x);
  goodThing.setAttribute("y", y);
  goodThing.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#goodthing");
  document.getElementById("goodthings").appendChild(goodThing);
}

// Shoots a bullet from the player
function shootBullet() {
  // Disable shooting for a short period of time
  canShoot = false;
  setTimeout("canShoot = true", SHOOT_INTERVAL);

  // Create the bullet using the use node
  var bullet = document.createElementNS("http://www.w3.org/2000/svg", "use");

  if (player.facing == facingType.RIGHT) {
    x = player.position.x + PLAYER_SIZE.w / 2 - BULLET_SIZE.w / 2;
  } else {
    x = player.position.x + BULLET_SIZE.w / 2;
  }

  bullet.setAttribute("direction", player.facing)
  bullet.setAttribute("x", x);
  bullet.setAttribute("y", player.position.y + PLAYER_SIZE.h / 2 - BULLET_SIZE.h / 2);
  bullet.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#bullet");
  document.getElementById("bullets").appendChild(bullet);
}

// Moves player
function movePlayer() {
  // Check whether the player is on a platform
  var isOnPlatform = player.isOnPlatform();

  // Update player position
  var displacement = new Point();

  // Move left or right
  if (player.motion == motionType.LEFT)
    displacement.x = -MOVE_DISPLACEMENT;
  if (player.motion == motionType.RIGHT)
    displacement.x = MOVE_DISPLACEMENT;

  // Fall
  if (!isOnPlatform && player.verticalSpeed <= 0) {
    displacement.y = -player.verticalSpeed;
    player.verticalSpeed -= VERTICAL_DISPLACEMENT;
  }

  // Jump
  if (player.verticalSpeed > 0) {
    displacement.y = -player.verticalSpeed;
    player.verticalSpeed -= VERTICAL_DISPLACEMENT;
    if (player.verticalSpeed <= 0)
      player.verticalSpeed = 0;
  }

  // Get the new position of the player
  var position = new Point();
  position.x = player.position.x + displacement.x;
  position.y = player.position.y + displacement.y;

  // Check collision with platforms and screen
  player.collidePlatform(position);
  player.collideScreen(position);

  // Set the location back to the player object (before update the screen)
  player.position = position;
}

// Moves monsyers
function moveMonsters() {
  // Go through all bullets
  var monsters = document.getElementById("monsters");
  for (var i = 0; i < monsters.childNodes.length; i++) {
    var node = monsters.childNodes.item(i);
    var initx = parseInt(node.getAttribute("initx"));
    var endx = parseInt(node.getAttribute("endx"));
    var x = parseInt(node.getAttribute("x"));
    var velocity = (node.getAttribute("direction") == facingType.RIGHT) ? MONSTER_SPEED : -MONSTER_SPEED;

    if (node.shootable) {

    }

    node.setAttribute("x", x + velocity);

    if (x >= Math.max(initx, endx)) {
      node.setAttribute("direction", facingType.LEFT);
    } else if (x <= Math.min(initx, endx)) {
      node.setAttribute("direction", facingType.RIGHT);
    }

    var t = x + MONSTER_SIZE.w / 2;
    var s = (node.getAttribute("direction") == facingType.LEFT) ? -1 : 1;

    node.setAttribute("transform", "translate(" + t + ", 0) scale(" + s + ", 1) translate(-" + t + ", 0)");
  }
}

// Updates positions of the bullets
function moveBullets() {
  // Go through all bullets
  var bullets = document.getElementById("bullets");
  for (var i = 0; i < bullets.childNodes.length; i++) {
    var node = bullets.childNodes.item(i);

    // Update the position of the bullet
    var x = parseInt(node.getAttribute("x"));
    var velocity = (node.getAttribute("direction") == facingType.RIGHT) ? BULLET_SPEED : -BULLET_SPEED;

    node.setAttribute("x", x + velocity);

    // If the bullet is not inside the screen delete it from the group
    if (x > SCREEN_SIZE.w) {
      bullets.removeChild(node);
      i--;
    }
  }
}

// Keydown handler
function keydown(evt) {
  var keyCode = (evt.keyCode) ? evt.keyCode : evt.getKeyCode();

  switch (keyCode) {
    case "A".charCodeAt(0):
      player.motion = motionType.LEFT;
      player.facing = facingType.LEFT;
      break;

    case "D".charCodeAt(0):
      player.motion = motionType.RIGHT;
      player.facing = facingType.RIGHT;
      break;

    case "W".charCodeAt(0):
      if (player.isOnPlatform()) {
        player.verticalSpeed = JUMP_SPEED;
      }
      break;

    case "H".charCodeAt(0):
      if (canShoot) shootBullet();
      break;
  }
}

// Keyup handler
function keyup(evt) {
  // Get the key code
  var keyCode = (evt.keyCode) ? evt.keyCode : evt.getKeyCode();

  switch (keyCode) {
    case "A".charCodeAt(0):
      if (player.motion == motionType.LEFT) player.motion = motionType.NONE;
      break;

    case "D".charCodeAt(0):
      if (player.motion == motionType.RIGHT) player.motion = motionType.NONE;
      break;
  }
}

// Collision checking
function collisionDetection() {
  // Check whether the player collides with a monster
  var monsters = document.getElementById("monsters");
  for (var i = 0; i < monsters.childNodes.length; i++) {
    var monster = monsters.childNodes.item(i);
    var x = parseInt(monster.getAttribute("x"));
    var y = parseInt(monster.getAttribute("y"));

    if (intersect(new Point(x, y), MONSTER_SIZE, player.position, PLAYER_SIZE)) {
      die();
    }
  }

  // Check whether a bullet hits a monster
  var bullets = document.getElementById("bullets");
  for (var i = 0; i < bullets.childNodes.length; i++) {
    var bullet = bullets.childNodes.item(i);
    var x = parseInt(bullet.getAttribute("x"));
    var y = parseInt(bullet.getAttribute("y"));

    for (var j = 0; j < monsters.childNodes.length; j++) {
      var monster = monsters.childNodes.item(j);
      var mx = parseInt(monster.getAttribute("x"));
      var my = parseInt(monster.getAttribute("y"));

      if (intersect(new Point(x, y), BULLET_SIZE, new Point(mx, my), MONSTER_SIZE)) {
        monsters.removeChild(monster);
        j--;
        bullets.removeChild(bullet);
        i--;
      }
    }
  }
}

// Updates position and motion of the player
function gamePlay() {
  collisionDetection();
  movePlayer();
  moveBullets();
  moveMonsters();
  updateScreen();
}

// This function updates the position of the player's SVG object and
// set the appropriate translation of the game screen relative to the
// the position of the player
function updateScreen() {
  // Calculate the scaling and translation factors
  var s = (player.facing == facingType.LEFT) ? "-1" : "1";
  var t = PLAYER_SIZE.w / 2;

  // Transform the player
  player.node_no_name.setAttribute("transform", "translate(" + t + ", 0) scale(" + s + ", 1) translate(-" + t + ", 0)");
  player.node.setAttribute("transform", "translate(" + player.position.x + "," + player.position.y + ")");
}

// Dies
function die() {
  alert("Game over!");
  clearInterval(gameInterval);
  clearInterval(countDownInterval);
}

// Counts down by 1 second
function countDown() {
  time_left -= 1;

  if (time_left >= 0) {
    document.getElementById("time").textContent = "" + time_left + " sec";
  } else {
    die();
  }
}

// Starts timer
function startTimer() {
  countDownInterval = setInterval("countDown()", 1000);
}

// Starts game
function startGame() {
  document.getElementById("time").textContent = "" + time_left + " sec";

  var button = document.getElementById("button");
  var startScreen = document.getElementById("startscreen");
  var player_name = prompt("Enter your name:");

  load(player_name);
  startScreen.setAttribute("visibility", "hidden");
  startTimer();
}

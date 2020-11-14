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
var SCORE_LEVEL = 100;
var SCORE_TIME = 2;
var SCORE_MONSTER = 10;
var SCORE_GOOD_THING = 15;

var TIME_LIMIT = 60;
var GAME_INTERVAL = 25; // Time interval of running the game
var SCREEN_SIZE = new Size(600, 560); // Size of the game screen

var PLAYER_SIZE = new Size(40, 40); // Size of the player
var PLAYER_INIT_POS = new Point(0, 0); // Initial position of the player
var MOVE_DISPLACEMENT = 5; // Speed of the player in motion
var JUMP_SPEED = 15; // Speed of the player jumping
var VERTICAL_DISPLACEMENT = 1; // Displacement of vertical speed
var SHOOT_INTERVAL = 200.0; // The period when shooting is disabled

var INIT_NUM_MONSTERS = 6; // Number of monsters
var NUM_MONSTER_INCREMENT = 4;
var MONSTER_SIZE = new Size(40, 40); // Size of a monster
var MONSTER_SPEED = 1.0; // Speed of monsters
var MONSTER_DISTANCE = 120; // Minimum initial distance of monsters from the player

var BULLET_SIZE = new Size(10, 10); // Size of a bullet
var BULLET_SPEED = 10.0; // Speed of a bullet
var NUM_BULLETS = 8; // Number of bullets

var NUM_GOOD_THINGS = 8; // Number of good things
var GOOD_THING_SIZE = new Size(40, 40); // Size of the good things

var EXIT_SIZE = new Size(40, 40);
var EXIT_POSITION = new Point(520, 500);

var PORTAL1_SIZE = new Size(40, 40);
var PORTAL2_SIZE = new Size(40, 40);
var PORTAL1_POSITION = new Point(180, 120);
var PORTAL2_POSITION = new Point(0, 440);

var PORTAL2_DESTINATION = new Point(140, 120);
var PORTAL1_DESTINATION = new Point(40, 440);

var SOUND_BACKGROUND = "sounds/background.mp3";
var SOUND_PLAYER_DIES = "sounds/death.mp3";
var SOUND_MONSTER_DIES = "sounds/death.ogg";
var SOUND_SHOOT = "sounds/shoot.ogg";
var SOUND_LEVEL_UP = "sounds/levelup.ogg";
var VERTICAL_PLATFORM_TOP = 100;
var VERTICAL_PLATFORM_BOTTOM = 300;
var VERTICAL_PLATFORM_INIT_Y = 100;


// Variablesd
var cheatMode = false;
var currentLevel = 0;
var score = 0;

var gameInterval = null; // Game interval
var countDownInterval = null; // Countdown interval
var zoom = 1.0; // Zoom level of the screen
var timeLeft = TIME_LIMIT; // Amount of time left in seconds

var player = null; // Player object
var playerName = "";
var canShoot = true; // Whether the player can shoot a bullet
var bulletsLeft = NUM_BULLETS; // Number of bullets left
var isOnDisappearingPlatform = [false, false, false];
var disappearingTimeout = [null, null, null];
var hasDisappearingPlatform = [true, true, true];
var removedChildren = [null, null, null];
var disappearingPlatformParents = null;

var numMonsters = INIT_NUM_MONSTERS;
var goodThingsLeft = NUM_GOOD_THINGS;

var backgroundSound = new Audio(SOUND_BACKGROUND);
backgroundSound.loop = true;
backgroundSound.volume = .2;
var playerDiesSound = new Audio(SOUND_PLAYER_DIES);


function playSound(src) {
  (new Audio(src)).play();
}

// Helper function for checking intersection between two rectangles
function intersect(pos1, size1, pos2, size2) {
  return (pos1.x < pos2.x + size2.w && pos1.x + size1.w > pos2.x &&
    pos1.y < pos2.y + size2.h && pos1.y + size1.h > pos2.y);
}

// Generates random integer from vmin to vmax - 1
function rng(vmin, vmax) {
  return vmin + Math.floor((vmax - vmin) * Math.random());
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

Player.prototype.isOnDisappearingPlatform = function(i) {
  var node = document.getElementById("disappearingplatform" + i);

  var x = parseFloat(node.getAttribute("x"));
  var y = parseFloat(node.getAttribute("y"));
  var w = parseFloat(node.getAttribute("width"));
  var h = parseFloat(node.getAttribute("height"));

  if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
      ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
      (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
      (this.position.y + PLAYER_SIZE.h == y)) return true;

  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) return true;

  return false;
}

Player.prototype.isOnVerticalPlatform = function() {
  var node = document.getElementById("verticalplatform");
  var onTopOfVerticalPlatForm = false;

  var x = parseFloat(node.getAttribute("x"));
  var y = parseFloat(node.getAttribute("y"));
  var w = parseFloat(node.getAttribute("width"));
  var h = parseFloat(node.getAttribute("height"));

  diff = this.position.y + PLAYER_SIZE.h - y;
  if ((diff >= -3) && (diff <= 1)) {
    onTopOfVerticalPlatForm = true;
  }

  if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
      ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
      (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
    ((this.position.y + PLAYER_SIZE.h == y) || onTopOfVerticalPlatForm)) return true;

  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) return true;

  return false;
}

Player.prototype.isOnPlatform = function() {
  var platforms = document.getElementById("platforms");
  for (var i = 0; i < platforms.childNodes.length; i++) {
    var node = platforms.childNodes.item(i);
    var onTopOfVerticalPlatForm = false;

    if (node.nodeName != "rect") continue;

    var x = parseFloat(node.getAttribute("x"));
    var y = parseFloat(node.getAttribute("y"));
    var w = parseFloat(node.getAttribute("width"));
    var h = parseFloat(node.getAttribute("height"));

    if (node.id == "verticalplatform") {
      diff = this.position.y + PLAYER_SIZE.h - y;
      if ((diff >= -3) && (diff <= -1)) {
        onTopOfVerticalPlatForm = true;
      }
    }

    if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
        ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
        (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
      ((this.position.y + PLAYER_SIZE.h == y) || onTopOfVerticalPlatForm)) return true;
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
      if (!this.isOnVerticalPlatform()) {
        position.x = this.position.x;
      }
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

function collidePlatform(position) {
  var platforms = document.getElementById("platforms");
  for (var i = 0; i < platforms.childNodes.length; ++i) {
    var node = platforms.childNodes.item(i);
    if (node.nodeName != "rect") continue;

    var x = parseFloat(node.getAttribute("x"));
    var y = parseFloat(node.getAttribute("y"));
    var w = parseFloat(node.getAttribute("width"));
    var h = parseFloat(node.getAttribute("height"));
    var pos = new Point(x, y);
    var size = new Size(w, h);

    if (intersect(position, GOOD_THING_SIZE, pos, size)) {
      return true;
    }
  }

  var goodThings = document.getElementById("goodthings");

  for (var i = 0; i < goodThings.childNodes.length; i++) {
    var goodThing = goodThings.childNodes.item(i);
    var x = parseInt(goodThing.getAttribute("x"));
    var y = parseInt(goodThing.getAttribute("y"));

    if (intersect(position, GOOD_THING_SIZE, new Point(x, y), GOOD_THING_SIZE)) {
      return true;
    }
  }

  if (intersect(position, GOOD_THING_SIZE, player.position, PLAYER_SIZE)) {
    return true;
  }

  return false;
}

function createGoodThing() {
  var pos = new Point(0, 0);

  do {
    pos.x = Math.floor(rng(0, SCREEN_SIZE.w - GOOD_THING_SIZE.w - 40));
    pos.y = Math.floor(rng(0, SCREEN_SIZE.h - GOOD_THING_SIZE.h - 40));
  }
  while (collidePlatform(pos));

  node = document.createElementNS("http://www.w3.org/2000/svg", "use");
  node.setAttribute("x", pos.x);
  node.setAttribute("y", pos.y);
  node.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#goodthing");
  document.getElementById("goodthings").appendChild(node);
}

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

// Create exit
function createExit() {
  node = document.getElementById("exit");
  node.setAttribute("transform", "translate(" + EXIT_POSITION.x + "," + EXIT_POSITION.y + ")");
}

function createPortals() {
  portal1 = document.getElementById("portal1");
  portal1.setAttribute("transform", "translate(" + PORTAL1_POSITION.x + "," + PORTAL1_POSITION.y + ")");
  portal2 = document.getElementById("portal2");
  portal2.setAttribute("transform", "translate(" + PORTAL2_POSITION.x + "," + PORTAL2_POSITION.y + ")");
}

function createVerticalPlatform() {
  var node = document.getElementById("verticalplatform");
  node.setAttribute("direction", 1);
}

function fadingRemove(thing, s, i) {
    thing.style.transition = "opacity "+ s +"s ease";
    thing.style.opacity = 0;
    setTimeout(function() {
      removedChildren[i] = thing.parentNode.removeChild(thing);
    }, s * 1000);
}

function removeDisappearingPlatform(i) {
  hasDisappearingPlatform[i] = false;
  fadingRemove(document.getElementById('disappearingplatform' + i), 1, i);
}

// Shoots a bullet from the player
function shootBullet() {
  if (!cheatMode) {
    bulletsLeft--;
  }

  updateBulletsNumber();

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
  playSound(SOUND_SHOOT);
}

// Shoots a bullet from the monster
function monsterShootsBullet(monster) {
  if (document.getElementById("monsterbullets").childNodes.length == 0) {
    // Create the bullet using the use node
    var bullet = document.createElementNS("http://www.w3.org/2000/svg", "use");
    var facing = monster.getAttribute("direction");
    var mx = parseInt(monster.getAttribute("x"));
    var my = parseInt(monster.getAttribute("y"));

    if (facing == facingType.RIGHT) {
      x = mx + MONSTER_SIZE.w / 2 - BULLET_SIZE.w / 2;
    } else {
      x = mx + BULLET_SIZE.w / 2;
    }

    bullet.setAttribute("direction", facing)
    bullet.setAttribute("x", x);
    bullet.setAttribute("y", my + MONSTER_SIZE.h / 2 - BULLET_SIZE.h / 2);
    bullet.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#monsterbullet");
    document.getElementById("monsterbullets").appendChild(bullet);
  }
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

  for (var i = 0; i < 3; ++i) {
    if (hasDisappearingPlatform[i]) {
      if (player.isOnDisappearingPlatform(i)) {
        if (!isOnDisappearingPlatform[i]) {
          isOnDisappearingPlatform[i] = true;
          disappearingTimeout[i] = setTimeout("removeDisappearingPlatform(" + i+ ")", 500);
        }
      }
      else {
        if (isOnDisappearingPlatform[i]) {
          isOnDisappearingPlatform[i] = false;
          if (disappearingTimeout[i] != null) {
            clearTimeout(disappearingTimeout[i]);
          }
        }
      }
    }
  }
}

function moveVerticalPlatform() {
  var node = document.getElementById("verticalplatform");
  var y = parseInt(node.getAttribute("y"));

  if (y <= VERTICAL_PLATFORM_TOP) {
    node.setAttribute("direction", 1);
  }
  else if (y >= VERTICAL_PLATFORM_BOTTOM) {
    node.setAttribute("direction", -1);
  }

  var direction = parseInt(node.getAttribute("direction"));
  node.setAttribute("y", y + direction);

  if (player.isOnVerticalPlatform()) {
    player.position.y += direction;
  }
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

    node.setAttribute("x", x + velocity);

    if (x >= Math.max(initx, endx)) {
      node.setAttribute("direction", facingType.LEFT);
    } else if (x <= Math.min(initx, endx)) {
      node.setAttribute("direction", facingType.RIGHT);
    }

    var t = x + MONSTER_SIZE.w / 2;
    var s = (node.getAttribute("direction") == facingType.LEFT) ? -1 : 1;

    node.setAttribute("transform", "translate(" + t + ", 0) scale(" + s + ", 1) translate(-" + t + ", 0)");

    if (node.shootable) {
      monsterShootsBullet(node);
    }
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
    if ((x > SCREEN_SIZE.w) || (x < 0)) {
      bullets.removeChild(node);
      i--;
    }
  }
}

function moveMonsterBullets() {
  // Go through all bullets
  var bullets = document.getElementById("monsterbullets");
  for (var i = 0; i < bullets.childNodes.length; i++) {
    var node = bullets.childNodes.item(i);

    // Update the position of the bullet
    var x = parseInt(node.getAttribute("x"));
    var velocity = (node.getAttribute("direction") == facingType.RIGHT) ? BULLET_SPEED : -BULLET_SPEED;

    node.setAttribute("x", x + velocity);

    // If the bullet is not inside the screen delete it from the group
    if ((x > SCREEN_SIZE.w) || (x < 0)) {
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
      if (canShoot && (cheatMode || (bulletsLeft > 0))) {
        shootBullet();
      }
      break;

    case "C".charCodeAt(0):
      cheatMode = true;
      updateBulletsNumber();
      break;

    case "V".charCodeAt(0):
      cheatMode = false;
      updateBulletsNumber();
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

// When player completes the level
function completesLevel() {
  addScore(currentLevel * SCORE_LEVEL + timeLeft * SCORE_TIME);
  numMonsters += NUM_MONSTER_INCREMENT;
  playSound(SOUND_LEVEL_UP);
  load(playerName);
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
      if (!cheatMode) {
        die();
      }
    }
  }

  var goodThings = document.getElementById("goodthings");

  for (var i = 0; i < goodThings.childNodes.length; i++) {
    var goodThing = goodThings.childNodes.item(i);
    var x = parseInt(goodThing.getAttribute("x"));
    var y = parseInt(goodThing.getAttribute("y"));

    if (intersect(player.position, PLAYER_SIZE, new Point(x, y), GOOD_THING_SIZE)) {
      goodThings.removeChild(goodThing);
      i--;
      goodThingsLeft--;
      addScore(SCORE_GOOD_THING);
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
        addScore(SCORE_MONSTER);
        playSound(SOUND_MONSTER_DIES);
      }
    }
  }

  // Check whether a monster bullet hits the player
  var bullets = document.getElementById("monsterbullets");
  for (var i = 0; i < bullets.childNodes.length; i++) {
    var bullet = bullets.childNodes.item(i);
    var x = parseInt(bullet.getAttribute("x"));
    var y = parseInt(bullet.getAttribute("y"));

    if (intersect(new Point(x, y), BULLET_SIZE, player.position, PLAYER_SIZE)) {
      bullets.removeChild(bullet);
      i--;
      if (!cheatMode) {
        die();
      }
    }
  }

  // Check whether the player hits the exit
  if (intersect(EXIT_POSITION, EXIT_SIZE, player.position, PLAYER_SIZE)) {
    if (goodThingsLeft == 0) {
      completesLevel();
    }
  }

  if (intersect(PORTAL1_POSITION, PORTAL1_SIZE, player.position, PLAYER_SIZE)) {
    player.position.x = PORTAL1_DESTINATION.x;
    player.position.y = PORTAL1_DESTINATION.y;
  }
  else if (intersect(PORTAL2_POSITION, PORTAL2_SIZE, player.position, PLAYER_SIZE)) {
    player.position.x = PORTAL2_DESTINATION.x;
    player.position.y = PORTAL2_DESTINATION.y;
  }
}

function addScore(amount) {
  score += amount;
  document.getElementById("score").textContent = score;
}

// Executed after the page is loaded
function load(playerName) {
  document.getElementById("verticalplatform").setAttribute("y", VERTICAL_PLATFORM_INIT_Y);
  if (gameInterval != null) {
    clearInterval(gameInterval);
  }

  if (countDownInterval != null) {
    clearInterval(countDownInterval);
  }

  startTimer();

  currentLevel++;
  document.getElementById("levelnumber").textContent = currentLevel;
  timeLeft = TIME_LIMIT;
  document.getElementById("time").textContent = "" + timeLeft + " sec.";
  bulletsLeft = NUM_BULLETS;
  updateBulletsNumber();
  goodThingsLeft = NUM_GOOD_THINGS;

  // Attach keyboard events
  document.addEventListener("keydown", keydown, false);
  document.addEventListener("keyup", keyup, false);

  // Create the player
  player = new Player(playerName);

  for (var i = 0; i < 3; ++i) {
    if (removedChildren[i] != null) {
      hasDisappearingPlatform[i] = true;
      removedChildren[i].style.opacity = 1;
      disappearingPlatformParents[i].appendChild(removedChildren[i]);
      removedChildren[i] = null;
    }
  }

  createExit();
  createPortals();
  createVerticalPlatform();

  // Create the monsters
  for (i = 0; i < numMonsters; i++) {
    createMonster(i == 0);
  }

  for (i = 0; i < NUM_GOOD_THINGS; i++) {
    createGoodThing();
  }

  // Start the game interval
  gameInterval = setInterval("gamePlay()", GAME_INTERVAL);
}

// Updates position and motion of the player
function gamePlay() {
  collisionDetection();
  moveVerticalPlatform();
  movePlayer();
  updateScreen();
  moveBullets();
  moveMonsterBullets();
  moveMonsters();
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
  backgroundSound.pause();
  playerDiesSound.play();
  clearInterval(gameInterval);
  clearInterval(countDownInterval);
  var highScoreTable = getHighScoreTable();

  // // Create the new score record
  var record = new ScoreRecord(playerName, score);

  // // Insert the new score record
  var position = 0;
  while (position < highScoreTable.length) {
      var curPositionScore = highScoreTable[position].score;
      if (curPositionScore < score)
          break;

      position++;
  }

  if (position < 5)
      highScoreTable.splice(position, 0, record);

  // Store the new high score table
  setHighScoreTable(highScoreTable);

  // Show the high score table
  showHighScoreTable(highScoreTable, position);
}

// Counts down by 1 second
function countDown() {
  timeLeft -= 1;

  if (timeLeft >= 0) {
    document.getElementById("time").textContent = "" + timeLeft + " sec.";
  } else {
    die();
  }
}

// Starts timer
function startTimer() {
  countDownInterval = setInterval("countDown()", 1000);
}

function updateBulletsNumber() {
  if (!cheatMode) {
    document.getElementById("bulletsnumber").textContent = bulletsLeft;
  }
  else {
    document.getElementById("bulletsnumber").textContent = "Infinite";
  }
}

function onLoad() {
  disappearingPlatformParents = [
    document.getElementById("disappearingplatform0").parentNode,
    document.getElementById("disappearingplatform1").parentNode,
    document.getElementById("disappearingplatform2").parentNode
  ];
}

// Starts game
function startGame(debug = false) {
  currentLevel = 0;
  score = 0;
  addScore(0);
  numMonsters = INIT_NUM_MONSTERS;

  var monsters = document.getElementById("monsters");
  while (monsters.firstChild) {
      monsters.firstChild.remove();
  }

  var goodThings = document.getElementById("goodthings");
  while (goodThings.firstChild) {
      goodThings.firstChild.remove();
  }

  document.getElementById("highscoretable").style.setProperty("visibility", "hidden", null);
  document.getElementById("time").textContent = "" + timeLeft + " sec.";
  updateBulletsNumber();

  var button = document.getElementById("button");
  var startScreen = document.getElementById("startscreen");
  playerName = (debug) ? "Anonymous" : prompt("Enter your name:", playerName);

  if ((playerName == "") || (playerName == null)) {
    playerName = "Anonymous";
  }

  backgroundSound.currentTime = 0;
  backgroundSound.play();

  load(playerName);
  startScreen.setAttribute("visibility", "hidden");
}

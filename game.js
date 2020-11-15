// Classes for point and size
function Point(x, y) {
  this.x = (x) ? parseFloat(x) : 0.;
  this.y = (y) ? parseFloat(y) : 0.;
}

function Size(w, h) {
  this.w = (w) ? parseFloat(w) : 0.;
  this.h = (h) ? parseFloat(h) : 0.;
}


// Motion enum
var motionType = {
  NONE: 0,
  LEFT: 1,
  RIGHT: 2
};

// Facing direction enum
var facingType = {
  LEFT: 0,
  RIGHT: 1
};

// Constants
var SCORE_LEVEL = 100;
var SCORE_TIME = 2;
var SCORE_MONSTER = 10;
var SCORE_GOOD_THING = 15;

var TIME_LIMIT = 60; // Time limit in seconds
var GAME_INTERVAL = 25; // Time interval of running the game in milliseconds

var SCREEN_SIZE = new Size(600, 560); // Size of the game screen

var PLAYER_SIZE = new Size(40, 40); // Size of the player
var PLAYER_INIT_POS = new Point(0, 0); // Initial position of the player
var PLAYER_X_SPEED = 5; // Horizontal speed of the player
var PLAYER_JUMP_SPEED = 15; // Jumping speed of the player
var PLAYER_Y_ACCELERATION = 1; // Vertical acceleration of the player
var PLAYER_SHOOT_INTERVAL = 200.0; // Refractory period after shooting

var NUM_MONSTERS_INIT = 6; // Number of monsters
var NUM_MONSTERS_INCREMENT = 4; // Increase in monsters after each level
var MONSTER_SIZE = new Size(40, 40); // Size of a monster
var MONSTER_SPEED = 1.0; // Speed of monsters
var MONSTER_DISTANCE = 120; // Minimum initial distance of monsters from the player

var NUM_BULLETS = 8; // Number of bullets
var BULLET_SIZE = new Size(10, 10); // Size of a bullet
var BULLET_SPEED = 10.0; // Speed of a bullet

var NUM_GOOD_THINGS = 8; // Number of good things
var GOOD_THING_SIZE = new Size(40, 40); // Size of the good things

var EXIT_SIZE = new Size(40, 40); // Size of exit
var EXIT_POSITION = new Point(520, 500); // Position of exit

var PORTAL1_SIZE = new Size(40, 40); // Size of portal 1
var PORTAL2_SIZE = new Size(40, 40); // Size of portal 2
var PORTAL1_POSITION = new Point(180, 120); // Position of portal 1
var PORTAL2_POSITION = new Point(0, 440); // Position of portal 2
var PORTAL1_DESTINATION = new Point(40, 440); // Destination of portal 1
var PORTAL2_DESTINATION = new Point(140, 120); // Destination of portal 2

var VERTICAL_PLATFORM_TOP = 100; // Top position of vertical platform
var VERTICAL_PLATFORM_BOTTOM = 300; // Bottom position of vertical platform
var VERTICAL_PLATFORM_INIT_Y = 100; // Initial position of vertical platform

var SOUND_BACKGROUND = "sounds/background.mp3"; // Background music
var SOUND_PLAYER_DIES = "sounds/death.mp3"; // Sound of player dying
var SOUND_MONSTER_DIES = "sounds/death.ogg"; // Sound of monster dying
var SOUND_SHOOT = "sounds/shoot.ogg"; // Sound of player shooting
var SOUND_LEVEL_UP = "sounds/levelup.ogg"; // Sound of completing a level

// Variables
var cheatMode = false;
var currentLevel = 0; // Current level
var score = 0; // Score
var gameInterval = null; // Game interval
var countDownInterval = null; // Countdown interval
var zoom = 1.0; // Zoom level of the screen
var timeLeft = TIME_LIMIT; // Amount of time left in seconds

var player = null; // Player object
var playerName = ""; // Name of player
var bulletsLeft = NUM_BULLETS;

var numMonsters = NUM_MONSTERS_INIT; // Number of monsters in the level
var goodThingsLeft = NUM_GOOD_THINGS; // Number of uncollected good things

var isOnDisappearingPlatform = [false, false, false]; // Whether the player is on the disappearing platform
var disappearingTimeout = [null, null, null]; // Timeout for each disappearing platform
var hasDisappearingPlatform = [true, true, true]; // Whete=her the disappearing platform exists
var removedDisappearingPlatforms = [null, null, null]; // Removed disappearing playform nodes
var disappearingPlatformParents = null; // Parent nodes of the disappearing platforms

var playerDiesSound = new Audio(SOUND_PLAYER_DIES);
var backgroundSound = new Audio(SOUND_BACKGROUND);
backgroundSound.loop = true;
backgroundSound.volume = .2;


// Play sound from source
function playSound(src) {
  (new Audio(src)).play();
}

// Check intersection between two rectangles
function intersect(pos1, size1, pos2, size2) {
  return (pos1.x < pos2.x + size2.w && pos1.x + size1.w > pos2.x &&
    pos1.y < pos2.y + size2.h && pos1.y + size1.h > pos2.y);
}

// Generates random integer from vmin to vmax - 1
function randomInteger(vmin, vmax) {
  return vmin + Math.floor((vmax - vmin) * Math.random());
}

// Player class
function Player() {
  this.node = document.getElementById("player");
  this.bodyNode = document.getElementById("playerbody");
  this.position = PLAYER_INIT_POS;
  this.motion = motionType.NONE;
  this.verticalSpeed = 0;
  this.facing = facingType.RIGHT;
  this.alive = true;
  this.readyToShoot = true;
  updateBulletsNumber();
  document.getElementById("nametag").textContent = playerName;
}

// Check whether player can shoot
Player.prototype.canShoot = function() {
  return (this.alive && this.readyToShoot && ((bulletsLeft > 0) || cheatMode));
}

// Check whether player is on disappearing platform
// Adapted from lab 4
Player.prototype.isOnDisappearingPlatform = function(i) {
  var node = document.getElementById("disappearingplatform" + i);
  var x = parseFloat(node.getAttribute("x"));
  var y = parseFloat(node.getAttribute("y"));
  var w = parseFloat(node.getAttribute("width"));
  var h = parseFloat(node.getAttribute("height"));

  if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
      ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
      (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
    (this.position.y + PLAYER_SIZE.h == y)) {
    return true;
  }

  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) {
    return true;
  }

  return false;
}

// Check whether player is on vertical platform
Player.prototype.isOnVerticalPlatform = function() {
  var node = document.getElementById("verticalplatform");
  var onTopOfVerticalPlatForm = false;
  var x = parseFloat(node.getAttribute("x"));
  var y = parseFloat(node.getAttribute("y"));
  var w = parseFloat(node.getAttribute("width"));
  var h = parseFloat(node.getAttribute("height"));

  diff = this.position.y + PLAYER_SIZE.h - y;

  if (((this.position.x + PLAYER_SIZE.w > x && this.position.x < x + w) ||
      ((this.position.x + PLAYER_SIZE.w) == x && this.motion == motionType.RIGHT) ||
      (this.position.x == (x + w) && this.motion == motionType.LEFT)) &&
    ((this.position.y + PLAYER_SIZE.h == y) || ((diff >= -3) && (diff <= 1)))) {
    return true;
  }

  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) {
    return true;
  }

  return false;
}

// Check whether player is on any platform
Player.prototype.isOnPlatform = function() {
  var platforms = document.getElementById("platforms");
  for (var i = 0; i < platforms.childNodes.length; ++i) {
    var node = platforms.childNodes.item(i);
    var onTopOfVerticalPlatForm = false;

    if (node.nodeName != "rect") {
      continue;
    }

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
      ((this.position.y + PLAYER_SIZE.h == y) || onTopOfVerticalPlatForm)) {
      return true;
    }
  }

  if (this.position.y + PLAYER_SIZE.h == SCREEN_SIZE.h) {
    return true;
  }

  return false;
}

// Check whether player collides with platform
// Adapted from lab 5
Player.prototype.collidePlatform = function(position) {
  var platforms = document.getElementById("platforms");

  for (var i = 0; i < platforms.childNodes.length; ++i) {
    var node = platforms.childNodes.item(i);

    if (node.nodeName != "rect") {
      continue;
    }

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
        if (this.position.y >= y + h) {
          position.y = y + h;
        } else {
          position.y = y - PLAYER_SIZE.h;
        }
        this.verticalSpeed = 0;
      }
    }
  }
}

// Check whether player collides with screen
// Adapted from lab 5
Player.prototype.collideScreen = function(position) {
  if (position.x < 0) {
    position.x = 0;
  }

  if (position.x + PLAYER_SIZE.w > SCREEN_SIZE.w) {
    position.x = SCREEN_SIZE.w - PLAYER_SIZE.w;
  }

  if (position.y < 0) {
    position.y = 0;
    this.verticalSpeed = 0;
  }

  if (position.y + PLAYER_SIZE.h > SCREEN_SIZE.h) {
    position.y = SCREEN_SIZE.h - PLAYER_SIZE.h;
    this.verticalSpeed = 0;
  }
}

function collides(node, pos, size) {
  var x = parseFloat(node.getAttribute("x"));
  var y = parseFloat(node.getAttribute("y"));
  var w = parseFloat(node.getAttribute("width"));
  var h = parseFloat(node.getAttribute("height"));

  return intersect(pos, size, new Point(x, y), new Size(w, h));
}

// Check whether good thing collides with things
function goodThingCollides(position) {
  var platforms = document.getElementById("platforms");

  for (var i = 0; i < platforms.childNodes.length; ++i) {
    var node = platforms.childNodes.item(i);

    if (node.nodeName != "rect")
      continue;

    if (collides(node, position, GOOD_THING_SIZE))
      return true;
  }

  var goodThings = document.getElementById("goodthings");

  for (var i = 0; i < goodThings.childNodes.length; ++i) {
    var goodThing = goodThings.childNodes.item(i);
    var x = parseInt(goodThing.getAttribute("x"));
    var y = parseInt(goodThing.getAttribute("y"));

    if (intersect(position, GOOD_THING_SIZE, new Point(x, y), GOOD_THING_SIZE))
      return true;
  }

  if (intersect(position, GOOD_THING_SIZE, player.position, PLAYER_SIZE))
    return true;

  if (intersect(position, GOOD_THING_SIZE, EXIT_POSITION, EXIT_SIZE))
    return true;

  if (intersect(position, GOOD_THING_SIZE, PORTAL1_POSITION, PORTAL1_SIZE))
    return true;

  if (intersect(position, GOOD_THING_SIZE, PORTAL2_POSITION, PORTAL2_SIZE))
    return true;

  return false;
}

// Create good thing
function createGoodThing() {
  var pos = new Point(0, 0);

  do {
    pos.x = Math.floor(randomInteger(0, SCREEN_SIZE.w - GOOD_THING_SIZE.w - 40));
    pos.y = Math.floor(randomInteger(0, SCREEN_SIZE.h - GOOD_THING_SIZE.h - 40));
  }
  while (goodThingCollides(pos));

  node = document.createElementNS("http://www.w3.org/2000/svg", "use");
  node.setAttribute("x", pos.x);
  node.setAttribute("y", pos.y);
  node.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#goodthing");
  document.getElementById("goodthings").appendChild(node);
}

// Create monster
function createMonster(shootable) {
  var startx = Math.floor(randomInteger(0, SCREEN_SIZE.w - MONSTER_SIZE.w));
  var starty = Math.floor(randomInteger(MONSTER_DISTANCE, SCREEN_SIZE.h - MONSTER_SIZE.h));
  var endx = Math.floor(randomInteger(MONSTER_DISTANCE, SCREEN_SIZE.w - MONSTER_SIZE.w));
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

// Create portal
function createPortals() {
  portal1 = document.getElementById("portal1");
  portal1.setAttribute("transform", "translate(" + PORTAL1_POSITION.x + "," + PORTAL1_POSITION.y + ")");
  portal2 = document.getElementById("portal2");
  portal2.setAttribute("transform", "translate(" + PORTAL2_POSITION.x + "," + PORTAL2_POSITION.y + ")");
}

// Remove object with fading animation
function fadingRemove(thing, s, i) {
  thing.style.transition = "opacity " + s + "s ease";
  thing.style.opacity = 0;

  setTimeout(function() {
    removedDisappearingPlatforms[i] = thing.parentNode.removeChild(thing);
  }, s * 1000);
}

// Remove ith disappearing platform
function removeDisappearingPlatform(i) {
  hasDisappearingPlatform[i] = false;
  fadingRemove(document.getElementById('disappearingplatform' + i), 1, i);
}

// Shoots a bullet from the player
function shootBullet() {
  if (!cheatMode) {
    --bulletsLeft;
  }

  updateBulletsNumber();

  // Disable shooting for a short period of time
  player.readyToShoot = false;
  setTimeout("player.readyToShoot = true", PLAYER_SHOOT_INTERVAL);

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
// Adapted from lab 4
function movePlayer() {
  // Check whether the player is on a platform
  var isOnPlatform = player.isOnPlatform();

  // Update player position
  var displacement = new Point();

  // Move left or right
  if (player.motion == motionType.LEFT) {
    displacement.x = -PLAYER_X_SPEED;
  }
  if (player.motion == motionType.RIGHT) {
    displacement.x = PLAYER_X_SPEED;
  }

  // Fall
  if (!isOnPlatform && player.verticalSpeed <= 0) {
    displacement.y = -player.verticalSpeed;
    player.verticalSpeed -= PLAYER_Y_ACCELERATION;
  }

  // Jump
  if (player.verticalSpeed > 0) {
    displacement.y = -player.verticalSpeed;
    player.verticalSpeed -= PLAYER_Y_ACCELERATION;
    if (player.verticalSpeed <= 0) {
      player.verticalSpeed = 0;
    }
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
          disappearingTimeout[i] = setTimeout("removeDisappearingPlatform(" + i + ")", 500);
        }
      } else {
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

// Move vertical platform
function moveVerticalPlatform() {
  var node = document.getElementById("verticalplatform");
  var y = parseInt(node.getAttribute("y"));

  if (y <= VERTICAL_PLATFORM_TOP) {
    node.setAttribute("direction", 1);
  } else if (y >= VERTICAL_PLATFORM_BOTTOM) {
    node.setAttribute("direction", -1);
  }

  var direction = parseInt(node.getAttribute("direction"));
  node.setAttribute("y", y + direction);

  if (player.isOnVerticalPlatform()) {
    player.position.y += direction;
  }
}

// Move monsters
function moveMonsters() {
  var monsters = document.getElementById("monsters");

  for (var i = 0; i < monsters.childNodes.length; ++i) {
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

// Update positions of the bullets
// Adapted from lab 5
function moveBullets() {
  var bullets = document.getElementById("bullets");
  for (var i = 0; i < bullets.childNodes.length; ++i) {
    var node = bullets.childNodes.item(i);

    var x = parseInt(node.getAttribute("x"));
    var velocity = (node.getAttribute("direction") == facingType.RIGHT) ? BULLET_SPEED : -BULLET_SPEED;

    node.setAttribute("x", x + velocity);

    if ((x > SCREEN_SIZE.w) || (x < 0)) {
      if (bullets.contains(node)) {
        bullets.removeChild(node);
        --i;
      }
    }
  }
}

// Update position of monster bullets
function moveMonsterBullets() {
  var monsterbullets = document.getElementById("monsterbullets");

  for (var i = 0; i < monsterbullets.childNodes.length; ++i) {
    var node = monsterbullets.childNodes.item(i);
    var x = parseInt(node.getAttribute("x"));
    var velocity = (node.getAttribute("direction") == facingType.RIGHT) ? BULLET_SPEED : -BULLET_SPEED;

    node.setAttribute("x", x + velocity);

    if ((x > SCREEN_SIZE.w) || (x < 0)) {
      monsterbullets.removeChild(node);
      --i;
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
        player.verticalSpeed = PLAYER_JUMP_SPEED;
      }
      break;

    case "H".charCodeAt(0):
      if (player.canShoot()) {
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
  numMonsters += NUM_MONSTERS_INCREMENT;
  playSound(SOUND_LEVEL_UP);
  load();
}

// Collision checking
function collisionDetection() {
  // Check whether the player collides with a monster
  var monsters = document.getElementById("monsters");

  for (var i = 0; i < monsters.childNodes.length; ++i) {
    var monster = monsters.childNodes.item(i);
    var x = parseInt(monster.getAttribute("x"));
    var y = parseInt(monster.getAttribute("y"));

    if (intersect(new Point(x, y), MONSTER_SIZE, player.position, PLAYER_SIZE) && (!cheatMode)) {
      die();
    }
  }

  var goodThings = document.getElementById("goodthings");

  for (var i = 0; i < goodThings.childNodes.length; ++i) {
    var goodThing = goodThings.childNodes.item(i);
    var x = parseInt(goodThing.getAttribute("x"));
    var y = parseInt(goodThing.getAttribute("y"));

    if (intersect(player.position, PLAYER_SIZE, new Point(x, y), GOOD_THING_SIZE)) {
      goodThings.removeChild(goodThing);
      --i;
      --goodThingsLeft;
      addScore(SCORE_GOOD_THING);
    }
  }

  // Check whether a bullet hits a monster
  var bullets = document.getElementById("bullets");

  for (var i = 0; i < bullets.childNodes.length; ++i) {
    var bullet = bullets.childNodes.item(i);
    var x = parseInt(bullet.getAttribute("x"));
    var y = parseInt(bullet.getAttribute("y"));

    for (var j = 0; j < monsters.childNodes.length; ++j) {
      var monster = monsters.childNodes.item(j);
      var mx = parseInt(monster.getAttribute("x"));
      var my = parseInt(monster.getAttribute("y"));

      if (intersect(new Point(x, y), BULLET_SIZE, new Point(mx, my), MONSTER_SIZE)) {
        monsters.removeChild(monster);
        --j;
        if (bullets.contains(bullet)) {
          bullets.removeChild(bullet);
          --i;
        }
        addScore(SCORE_MONSTER);
        playSound(SOUND_MONSTER_DIES);
      }
    }
  }

  // Check whether a monster bullet hits the player
  var bullets = document.getElementById("monsterbullets");

  for (var i = 0; i < bullets.childNodes.length; ++i) {
    var bullet = bullets.childNodes.item(i);
    var x = parseInt(bullet.getAttribute("x"));
    var y = parseInt(bullet.getAttribute("y"));

    if (intersect(new Point(x, y), BULLET_SIZE, player.position, PLAYER_SIZE)) {
      bullets.removeChild(bullet);
      --i;
      if (!cheatMode) {
        die();
      }
    }
  }

  // Check whether the player hits the exit
  if (intersect(EXIT_POSITION, EXIT_SIZE, player.position, PLAYER_SIZE) && (goodThingsLeft == 0)) {
    completesLevel();
  }

  if (intersect(PORTAL1_POSITION, PORTAL1_SIZE, player.position, PLAYER_SIZE)) {
    player.position.x = PORTAL1_DESTINATION.x;
    player.position.y = PORTAL1_DESTINATION.y;
  } else if (intersect(PORTAL2_POSITION, PORTAL2_SIZE, player.position, PLAYER_SIZE)) {
    player.position.x = PORTAL2_DESTINATION.x;
    player.position.y = PORTAL2_DESTINATION.y;
  }
}

function clearObjects(objectId) {
  var objects = document.getElementById(objectId);

  while (objects.firstChild) {
    objects.firstChild.remove();
  }
}

// Reset platforms
function resetPlatforms() {
  var verticalPlatform = document.getElementById("verticalplatform");
  verticalPlatform.setAttribute("y", VERTICAL_PLATFORM_INIT_Y);
  verticalPlatform.setAttribute("direction", 1);

  for (var i = 0; i < 3; ++i) {
    if (removedDisappearingPlatforms[i] != null) {
      hasDisappearingPlatform[i] = true;
      removedDisappearingPlatforms[i].style.opacity = 1;
      disappearingPlatformParents[i].appendChild(removedDisappearingPlatforms[i]);
      removedDisappearingPlatforms[i] = null;
    }
  }
}

// Die
function die() {
  player.alive = false;
  backgroundSound.pause();
  playerDiesSound.play();
  clearInterval(gameInterval);
  clearInterval(countDownInterval);

  var highScoreTable = readHighScoreTable();
  var record = new ScoreRecord(playerName, score);
  var position = 0;

  while (position < highScoreTable.length) {
    if (highScoreTable[position].score < score)
      break;
      ++position;
  }

  highScoreTable.splice(position, 0, record);

  writeHighScoreTable(highScoreTable);
  displayHighScoreTable(highScoreTable, position);
}

function addScore(amount) {
  score += amount;
  document.getElementById("scoretext").textContent = score;
}

function addLevel() {
  document.getElementById("leveltext").textContent = ++currentLevel;
}

function updateBulletsNumber() {
  document.getElementById("bulletstext").textContent = (cheatMode) ? "Infinite" : bulletsLeft;
}

function updateTime() {
  document.getElementById("timetext").textContent = "" + timeLeft + " sec.";
}

function updateScreen() {
  // Calculate the scaling and translation factors
  var s = (player.facing == facingType.LEFT) ? "-1" : "1";
  var t = PLAYER_SIZE.w / 2;

  // Transform the player
  player.bodyNode.setAttribute("transform", "translate(" + t + ", 0) scale(" + s + ", 1) translate(-" + t + ", 0)");
  player.node.setAttribute("transform", "translate(" + player.position.x + "," + player.position.y + ")");
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

// Counts down by 1 second
function countDown() {
  if (--timeLeft >= 0)
    updateTime()
  else
    die();
}

// Starts timer
function startTimer() {
  if (gameInterval != null)
    clearInterval(gameInterval);

  if (countDownInterval != null)
    clearInterval(countDownInterval);

  timeLeft = TIME_LIMIT;
  updateTime();

  countDownInterval = setInterval("countDown()", 1000);
  gameInterval = setInterval("gamePlay()", GAME_INTERVAL);
}

// Executed after the page is loaded
function load() {
  clearObjects("monsters");
  clearObjects("monsterbullets");
  clearObjects("goodthings");
  clearObjects("bullets");

  bulletsLeft = NUM_BULLETS;
  updateBulletsNumber();

  player = new Player();

  addLevel();
  goodThingsLeft = NUM_GOOD_THINGS;

  resetPlatforms();
  createPortals();

  for (i = 0; i < numMonsters; ++i) {
    createMonster(i == 0);
  }

  for (i = 0; i < NUM_GOOD_THINGS; ++i) {
    createGoodThing();
  }

  // Attach keyboard events
  document.addEventListener("keydown", keydown, false);
  document.addEventListener("keyup", keyup, false);

  startTimer();
}

function onLoad() {
  disappearingPlatformParents = [
    document.getElementById("disappearingplatform0").parentNode,
    document.getElementById("disappearingplatform1").parentNode,
    document.getElementById("disappearingplatform2").parentNode
  ];

  exitNode = document.getElementById("exit");
  exitNode.setAttribute("transform", "translate(" + EXIT_POSITION.x + "," + EXIT_POSITION.y + ")");
}

// Starts game
function startGame() {
  currentLevel = 0;
  score = 0;
  addScore(0);
  numMonsters = NUM_MONSTERS_INIT;

  document.getElementById("highscoretable").style.setProperty("visibility", "hidden", null);
  document.getElementById("timetext").textContent = "" + timeLeft + " sec.";

  var startScreen = document.getElementById("startscreen");

  playerName = prompt("Enter your name:", playerName);

  if ((playerName == "") || (playerName == null)) {
    playerName = "Anonymous";
  }

  backgroundSound.currentTime = 0;
  backgroundSound.play();

  load();
  startScreen.setAttribute("visibility", "hidden");
}

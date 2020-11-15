// highscore.js, adapted from lab 6

NUM_RECORDS = 5;

// Class storing name and score
function ScoreRecord(name, score) {
  this.name = name;
  this.score = score;
}

// Read high score table from cookies
function readHighScoreTable() {
  var table = [];

  for (var i = 0; i < NUM_RECORDS; ++i) {
    // Get cookie using cookie name
    var recordString = readCookie("player" + i);

    // Break loop if cookie doesn't exist
    if (recordString == null)
      break;

    // Extract name and score
    var nameScore = recordString.split("~");

    // Append score record to high score table
    table.push(new ScoreRecord(nameScore[0], parseInt(nameScore[1])));
  }

  return table;
}

// Write high score table to cookies
function writeHighScoreTable(table) {
  for (var i = 0; (i < NUM_RECORDS) && (i < table.length); ++i)
    writeCookie("player" + i, table[i].name + "~" + table[i].score);
}

// Add high score record to the text node
function appendHighScoreRecord(record, node, highlight) {
  // Create text spans
  var name = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  var score = document.createElementNS("http://www.w3.org/2000/svg", "tspan");

  // Set attributes
  name.setAttribute("x", 100);
  name.setAttribute("dy", 40);
  score.setAttribute("x", 400);

  // Highlight current player's record
  if (highlight) {
    name.style.setProperty("fill", "red");
    score.style.setProperty("fill", "red");
  }

  name.appendChild(document.createTextNode(record.name));
  score.appendChild(document.createTextNode(record.score));
  node.appendChild(name);
  node.appendChild(score);
}

// Display high score table
function displayHighScoreTable(table, highlight = -1) {
  // Make table visible
  var node = document.getElementById("highscoretable");
  node.style.setProperty("visibility", "visible", null);

  // Clear text content of high score table
  var node = document.getElementById("highscoretext");
  node.textContent = null;

  for (var i = 0; (i < NUM_RECORDS) && (i < table.length); ++i)
    appendHighScoreRecord(table[i], node, i == highlight);
}

// Read cookie
function readCookie(name) {
  var cookie = document.cookie;
  var prefix = name + "=";
  var begin = cookie.indexOf("; " + prefix);

  if (begin == -1) {
    begin = cookie.indexOf(prefix);
    if (begin != 0)
      return null;
  } else
    begin += 2;

  var end = document.cookie.indexOf(";", begin);

  if (end == -1)
    end = cookie.length;

  return unescape(cookie.substring(begin + prefix.length, end));
}

// Write cookie
function writeCookie(name, value, expires, path, domain, secure) {
  var cookie = name + "=" + escape(value) +
    ((expires) ? "; expires=" + expires.toGMTString() : "") +
    ((path) ? "; path=" + path : "") +
    ((domain) ? "; domain=" + domain : "") +
    ((secure) ? "; secure" : "");
  document.cookie = cookie;
}

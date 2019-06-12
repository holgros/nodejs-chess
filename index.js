const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var url = require('url')
var app = require('express')()
var http = require('http').Server(app)
var fs = require ('fs')
const socketIO = require('socket.io')
var gameId;

const server = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  //.get('/', (req, res) => res.render('pages/index'))
  .get('/', (req, res) => writePage(req, res))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
  
const io = socketIO(server)

io.on('connection', function(socket){
	socket.on('moveFromClient', function(gameId, move) {
		var fileName = './views/games/' + gameId + '.json';
		var file = require(fileName);
		var positions;
		if (move.charAt(0) == 'w') {
			file.en_passant_square_white = "";
			positions = file.positions.white;
			file.move = 'black';
		}
		else {
			file.en_passant_square_black = "";
			positions = file.positions.black;
			file.move = 'white';
		}
		var oldSquare = move.substring(2,4);
		var newSquare = move.substring(4,6);
		if (move.charAt(1) == 'k') {
			if (oldSquare == 'e1') {
				file.white_king_moved = true;
			}
			if (oldSquare == 'e8') {
				file.black_king_moved = true;
			}
			positions.king = move.substring(4,6);
		}
		else {
			var arr;
			if (move.charAt(1) == 'p') {
				if (move.charAt(0) == 'w' && move.charAt(3) == '2' && move.charAt(5) == '4') {
					file.en_passant_square_white = move.charAt(2)+'3';
				}
				if (move.charAt(0) == 'b' && move.charAt(3) == '7' && move.charAt(5) == '5') {
					file.en_passant_square_black = move.charAt(2)+'4';
				}
				arr = positions.pawns;
			}
			if (move.charAt(1) == 'r') {
				if (oldSquare == 'a1') {
					file.white_rook_a_moved = true;
				}
				if (oldSquare == 'h1') {
					file.white_rook_h_moved = true;
				}
				if (oldSquare == 'a8') {
					file.black_rook_a_moved = true;
				}
				if (oldSquare == 'h8') {
					file.black_rook_h_moved = true;
				}
				arr = positions.rooks;
			}
			if (move.charAt(1) == 'n') {
				arr = positions.rooks;
			}
			if (move.charAt(1) == 'b') {
				arr = positions.bishops;
			}
			if (move.charAt(1) == 'q') {
				arr = positions.queens;
			}
			arr[arr.indexOf(oldSquare)] = newSquare;
		}
		if (move.charAt(6) == 'x') {
			if (move.substring(7, 9) == 'wp') {
				var index = file.positions.white.pawns.indexOf(move.substring(4,6));
				file.positions.white.pawns.splice(index, 1);
			}
			if (move.substring(7, 9) == 'bp') {
				var index = file.positions.black.pawns.indexOf(move.substring(4,6));
				file.positions.black.pawns.splice(index, 1);
			}
			if (move.substring(7, 9) == 'wr') {
				var index = file.positions.white.rooks.indexOf(move.substring(4,6));
				file.positions.white.rooks.splice(index, 1);
			}
			if (move.substring(7, 9) == 'br') {
				var index = file.positions.black.rooks.indexOf(move.substring(4,6));
				file.positions.black.rooks.splice(index, 1);
			}
			if (move.substring(7, 9) == 'wb') {
				var index = file.positions.white.bishops.indexOf(move.substring(4,6));
				file.positions.white.bishops.splice(index, 1);
			}
			if (move.substring(7, 9) == 'bb') {
				var index = file.positions.black.bishops.indexOf(move.substring(4,6));
				file.positions.black.bishops.splice(index, 1);
			}
			if (move.substring(7, 9) == 'wn') {
				var index = file.positions.white.knights.indexOf(move.substring(4,6));
				file.positions.white.knights.splice(index, 1);
			}
			if (move.substring(7, 9) == 'bn') {
				var index = file.positions.black.knights.indexOf(move.substring(4,6));
				file.positions.black.knights.splice(index, 1);
			}
			if (move.substring(7, 9) == 'wq') {
				var index = file.positions.white.queens.indexOf(move.substring(4,6));
				file.positions.white.queens.splice(index, 1);
			}
			if (move.substring(7, 9) == 'bq') {
				var index = file.positions.black.queens.indexOf(move.substring(4,6));
				file.positions.black.queens.splice(index, 1);
			}
		}

		fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
		  if (err) return console.log(err);
		  //console.log(JSON.stringify(file));
		  //console.log('writing to ' + fileName);
		});
		io.emit('moveFromServer'+gameId, move);
		//console.log("Emitted move " + move + " to game " + gameId);
	});
});

function writePage(req, res) {
	var q = url.parse(req.url, true).query;
	gameId = q.game;
	var playerName = q.name;
	var lang = q.language;
	if (typeof lang == 'undefined') {
		lang = "English";
	}
	var langData = fs.readFileSync(__dirname + '/views/languages/' + lang + '.json', 'utf-8');
	var lang = JSON.parse(langData);
	if (typeof gameId == 'undefined' || typeof playerName == 'undefined') {
		res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
		res.write(lang.error_message, "utf-8");
		return res.end();
	}
	var out = fs.readFileSync(__dirname + '/views/index.html', 'utf-8');
	out = out.replace(/---GAMEID---/g, gameId);
	out = out.replace(/---PLAYERNAME---/g, playerName);
	out = out.replace(/---LANG---/g, JSON.stringify(lang));
	var gameData = fs.readFileSync(__dirname + '/views/games/' + q.game + '.json', 'utf-8');
	var game = JSON.parse(gameData);
	out = out.replace(/---GAME---/g, JSON.stringify(game));
	return res.end(out);
}

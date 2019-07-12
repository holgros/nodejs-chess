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
	socket.on('newGame', function(player1Name, player1Email, player2Name, player2Email, message, millis, lang) {
		var fs = require ('fs')
		var startData = fs.readFileSync(__dirname + '/views/games/start_positions.json', 'utf-8');
		var startJson = JSON.parse(startData);
		var txt = JSON.stringify(startJson);
		txt = txt.replace(/PLAYER_NAME_WHITE/g, player1Name);
		txt = txt.replace(/PLAYER_NAME_BLACK/g, player2Name);
		txt = txt.replace(/PLAYER_WHITE_EMAIL/g, player1Email);
		txt = txt.replace(/PLAYER_BLACK_EMAIL/g, player2Email);
		var fileName = __dirname + '/views/maxNbr.txt';
		// the following two lines should really be synchronized but I can't be bothered
		var maxNbr = parseInt(fs.readFileSync(fileName, 'utf-8'))+1;
		fs.writeFile(fileName, maxNbr.toString(), function (err) {
			if (err) throw err;
		});
		fileName = __dirname + '/views/games/' + maxNbr.toString() + '.json';
		fs.writeFile(fileName, txt, function (err) {
			if (err) throw err;
		});
		var nodemailer = require('nodemailer');
		var fs = require('fs');
		var password = fs.readFileSync(__dirname + '/views/password.txt', 'utf8');
		var transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: 'holgros.chess@gmail.com',
				pass: password
			}
		});
		var langData = fs.readFileSync(__dirname + '/views/languages/' + lang + '.json', 'utf-8');
		lang = JSON.parse(langData);
		if (message == "") {
			message = lang.sample_message;
		}
		var messageBody = lang.invitation.replace(/___PLAYER_1_NAME___/g, player1Name).replace(/___PLAYER_2_NAME___/g, player2Name).replace(/___LINK___/g, 'https://holgros-chess.herokuapp.com?name='+player2Name+'&game='+maxNbr+'&language='+lang.LANGUAGE_IN_ENGLISH).replace(/___MESSAGE___/g, message);
		var mailOptions = {
			from: player1Email,
			replyTo: player1Email,
			to: player2Email,
			subject: player1Name + lang.has_invited_you,
			text: messageBody
		};
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
		var messageBody = lang.confirmation_message.replace(/___PLAYER_1_NAME___/g, player1Name).replace(/___PLAYER_2_NAME___/g, player2Name).replace(/___LINK___/g, 'https://holgros-chess.herokuapp.com?name='+player1Name+'&game='+maxNbr+'&language='+lang.LANGUAGE_IN_ENGLISH);
		var mailOptions = {
			from: player2Email,
			replyTo: player2Email,
			to: player1Email,
			subject: lang.confirmation_header.replace(/___PLAYER_2_NAME___/g, player2Name),
			text: messageBody
		};
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
		io.emit('redirect'+millis, maxNbr);
	});
	
	socket.on('moveFromClient', function(gameId, move) {
		console.log(move);
		var fileName = './views/games/' + gameId + '.json';
		var file = require(fileName);
		var positions;
		if (file.move == 'white') {
			file.en_passant_square_white = '';
			positions = file.positions.white;
			file.move = 'black';
			if (move == '0-0') {
				file.white_king_moved = true;
				file.white_rook_h_moved = true;
				positions.king = 'g1';
				positions.rooks[positions.rooks.indexOf('h1')] = 'f1';
				fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
					if (err) return console.log(err);
				});
				io.emit('moveFromServer'+gameId, move);
				return;

			}
			if (move == '0-0-0') {
				file.white_king_moved = true;
				file.white_rook_a_moved = true;
				positions.king = 'c1';
				positions.rooks[positions.rooks.indexOf('a1')] = 'd1';
				fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
					if (err) return console.log(err);
				});
				io.emit('moveFromServer'+gameId, move);
				return;
			}
		}
		else {
			file.en_passant_square_black = '';
			positions = file.positions.black;
			file.move = 'white';
			if (move == '0-0') {
				file.black_king_moved = true;
				file.black_rook_h_moved = true;
				positions.king = 'g8';
				positions.rooks[positions.rooks.indexOf('h8')] = 'f8';
				fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
					if (err) return console.log(err);
				});
				io.emit('moveFromServer'+gameId, move);
				return;
			}
			if (move == '0-0-0') {
				file.black_king_moved = true;
				file.black_rook_a_moved = true;
				positions.king = 'c8';
				positions.rooks[positions.rooks.indexOf('a8')] = 'd8';
				fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
					if (err) return console.log(err);
				});
				io.emit('moveFromServer'+gameId, move);
				return;
			}
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
					file.en_passant_square_black = move.charAt(2)+'6';
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
				arr = positions.knights;
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
				var index = file.positions.white.pawns.indexOf(newSquare);
				if (file.en_passant_square_white == newSquare && move.charAt(1) == 'p') {
					index = file.positions.white.pawns.indexOf(newSquare.charAt(0)+'4');
				}
				file.positions.white.pawns.splice(index, 1);
			}
			if (move.substring(7, 9) == 'bp') {
				var index = file.positions.black.pawns.indexOf(newSquare);
				if (file.en_passant_square_black == newSquare && move.charAt(1) == 'p') {
					index = file.positions.black.pawns.indexOf(newSquare.charAt(0)+'5');
				}
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
		if (move.substring(0, 2) == "wp" && move.charAt(5) == "8") {
			var newSquareId = move.substring(4,6);
			var index = file.positions.white.pawns.indexOf(newSquareId);
			file.positions.white.pawns.splice(index, 1);
			if (move.charAt(move.length-1) == "q") {
				file.positions.white.queens.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "n") {
				file.positions.white.knights.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "r") {
				file.positions.white.rooks.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "b") {
				file.positions.white.bishops.push(newSquareId);
			}
		}
		if (move.substring(0, 2) == "bp" && move.charAt(5) == "1") {
			var newSquareId = move.substring(4,6);
			var index = file.positions.black.pawns.indexOf(newSquareId);
			file.positions.black.pawns.splice(index, 1);
			if (move.charAt(move.length-1) == "q") {
				file.positions.black.queens.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "n") {
				file.positions.black.knights.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "r") {
				file.positions.black.rooks.push(newSquareId);
			}
			if (move.charAt(move.length-1) == "b") {
				file.positions.black.bishops.push(newSquareId);
			}
		}
		file.history += '<li>'+move;
		fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
			if (err) return console.log(err);
		});
		io.emit('moveFromServer'+gameId, move);
	});
	
	socket.on('gameover', function(gameId, winner) {
		var fileName = './views/games/' + gameId + '.json';
		var file = require(fileName);
		file.gameover = true;
		file.winner = winner;
		if (winner != 'stalemate') {
			file.history += '#';
		}
		else {
			file.history += '=';
		}
		fs.writeFile(fileName, JSON.stringify(file, null, 2), function (err) {
			if (err) return console.log(err);
		});
		io.emit('gameover'+gameId, winner);
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
		res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
		//res.write(lang.error_message, 'utf-8');
		if (typeof gameId != 'undefined') {
			var gameData = fs.readFileSync(__dirname + '/views/games/' + q.game + '.json', 'utf-8');
			var game = JSON.parse(gameData);
			res.write('<br>' + lang.select_player, 'utf-8');
			res.write('<br><form><select id="playersdropdown"><option value="' + 
				game.white + 
				'">' + 
				game.white + 
				'</option><option value="' + 
				game.black + 
				'">' + 
				game.black + 
				'</option></select><br>');
			res.write('<button onclick="window.open(\'?game=' + gameId + '&name=\'+document.getElementById(\'playersdropdown\').value, \'_self\');">OK</button>');
			return res.end();
		}
		if (typeof playerName != 'undefined') {
			var games = [];
			fs.readdir(__dirname + '/views/games/', (err, files) => {
				files.forEach(file => {
					var gameData = fs.readFileSync(__dirname + '/views/games/' + file, 'utf-8');
					var game = JSON.parse(gameData);
					if (game.white == playerName || game.black == playerName) {
						games.push(file.substring(0, file.length-5));
					}
				});
				var currentTime = new Date();
				var millis = currentTime.getTime();
				var txt = '<script src="/socket.io/socket.io.js"></script>';
				txt += '<p>Hello ' + playerName + '!<br>';
				if (games.length > 0) {
					txt += '<p>' + lang.select_game + '<br><select id="gamesdropdown">';
					for (var i=0; i < games.length; i++) {
						txt += '<option>' + games[i] + '</option>';
					}
					txt += '</select><br><button onclick="window.open(\'?game=\'+document.getElementById(\'gamesdropdown\').value+\'&name=' + playerName + '\', \'_self\');">' + lang.start_game + '</button></p><p>' + lang.or + '</p>';
				}
				txt += lang.create_game;
				//txt += lang.your_name;
				txt += '<br><input type="hidden" id="player1Name" value="' + playerName + '"></input><br>';
				txt += lang.your_email;
				txt += '<br><input type="text" id="player1Email"></input><br>';
				txt += lang.friends_name;
				txt += '<br><input type="text" id="player2Name"></input><br>';
				txt += lang.friends_email;
				txt += '<br><input type="text" id="player2Email"></input>';
				txt += '<br>' + lang.message_to_friend;
				txt += '<br><textarea rows="4" cols="50" id="message" placeholder="' + lang.sample_message + '"></textarea>';
				txt += '<br>\n<button onclick="var eventEmitter=io();\neventEmitter.emit(\'newGame\', document.getElementById(\'player1Name\').value, document.getElementById(\'player1Email\').value, document.getElementById(\'player2Name\').value, document.getElementById(\'player2Email\').value, document.getElementById(\'message\').value, ' + millis + ', \'' + lang.LANGUAGE_IN_ENGLISH + '\');">' + lang.start_game + '</button></p>';
				txt += '\n<script>\nvar socket = io(); \nsocket.on("redirect' + millis + '", function(maxNbr) {\nwindow.open("?game=" + maxNbr + "&name="+document.getElementById("player1Name").value, \'_self\');});\n</script>';
				res.write(txt);
				return res.end();
			});
		}
		else {
			var txt = '<p>' + lang.enter_your_name;
			txt += '<br><input type="text" id="playerName"></input>';
			txt += '<br><button onclick="window.open(\'?name=\' + document.getElementById(\'playerName\').value, \'_self\');">';
			txt += lang.send;
			txt += '</button></p>';
			res.write(txt);
			return res.end();
		}
	}
	else {
		var out = fs.readFileSync(__dirname + '/views/index.html', 'utf-8');
		out = out.replace(/---GAMEID---/g, gameId);
		out = out.replace(/---PLAYERNAME---/g, playerName);
		out = out.replace(/---LANG---/g, JSON.stringify(lang));
		var gameData = fs.readFileSync(__dirname + '/views/games/' + q.game + '.json', 'utf-8');
		var game = JSON.parse(gameData);
		out = out.replace(/---GAME---/g, JSON.stringify(game));
		return res.end(out);
	}
}

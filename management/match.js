var boardmaker = require('./../management/board.js');

function match(roomid, MAXPLAYERS) {
    console.log("Creating match: %d with maxplayers: %d", roomid, MAXPLAYERS);
    this.roomid = roomid;
    //PlayerObj { "username" : "string", "socket" : socket, "alive" : boolean }
    this.players = [];
    this.playerCount = 0;
    this.MAXPLAYERS = MAXPLAYERS;
    this.board = new boardmaker.board(99);
    this.playing = false;

    this.safeEmit = function(socket, type, message) {
        if (socket.connected) {
            socket.emit(type, message);
        }
    }
    //returns a boolean if the room contains the user or not
    this.containsPlayer = function(username) {
        if (this.players == null || this.playerCount == 0) {
            console.log("containsPlayer::No players in room");
            return false;
        }
        for (var i = 0; i < this.playerCount; i++) {
            var obj = this.players[i];
            if (obj.username === username) {
                return true;
            }
        }
        return false;
    };
    //returns the index of the player in the array
    this.indexOf = function(username) {
        if (this.players == null || this.playerCount == 0) {
            console.log("indexOf::No players in room");
            return -1;
        }
        for (var i = 0; i < this.playerCount; i++) {
            var obj = this.players[i];
            if (obj.username === username) {
                return i;
            }
        }
        return -1;
    };
    //Returns boolean if successful connection
    this.join = function(username, socket) {
        if (this.containsPlayer(username)) {
            console.log("Aready contains player");
            return false;
        }
        if (this.playerCount == this.MAXPLAYERS) {
            console.log("FULL");
            return false;
        }
        var playerObj = {
            username : username,
            socket : socket,
            alive : true
        };
        this.players.push(playerObj);
        this.playerCount++;
        console.log("%s joined match %d", username, this.roomid);
        return true;
    };
    //Returns boolean if successful leave
    this.leave = function(username) {
        if (!this.containsPlayer(username)) {
            return false;
        }
        var index = this.indexOf(username);
        if (index == -1) {
            console.log("leave() contains username but recieved an incorrect index");
            return false;
        }
        if (this.playing) {
            //kill the player
            this.killPlayer(username);
            if (this.isGameOver()) {
                this.sendGameOver(this.getWinner());
            }
            console.log("%s left %d during play", username, this.roomid);
            return true;
        }
        else {
            //remove from lobby
            var playersCopy = new Array(this.players.length - 1);
            for (var i = 0; i < this.playerCount; i++) {
                var player = this.players[i];
                if (player.username !== username) {
                    playersCopy.push(player);
                }
                else {
                    //the actual player
                    this.safeEmit(player.socket, "Match.left", {
                        roomid : this.roomid
                    });
                }
            }
            this.playerCount--;
            this.players = playersCopy;
            console.log("%s left %d while in the lobby", username, this.roomid);
            return true;
        }
        
    };
    //Returns true if match will be full on next join, false otherwise
    this.willBeFull = function() {
        return ((this.playerCount + 1) == this.MAXPLAYERS);
    }
    //Returns true if match is currently full, false otherwise
    this.isFull = function() {
        return (this.playerCount == this.MAXPLAYERS);
    }
    this.getUsernames = function() {
        var usernames = new Array(this.playerCount);
        for (var i = 0; i < this.playerCount; i++) {
            usernames[i] = this.players[i].username;
        }
        return usernames;
    }
    // roomid: int, playerCount: int, players: [usernames]
    this.getMatchObj = function() {
        return {
            roomid: this.roomid,
            playerCount : this.playerCount,
            players : this.getUsernames(),
            board : this.getBoardObj(0)
        };
    }
    //Returns array [{ "id" : int, "enemy" : string, "spawnTime", float}]
    this.getBoardObj = function(startIndex) {
        return this.board.getSegment(startIndex);
    }
    //Send signal of type type to every player
    //returns nothing
    this.sendToPlayers = function(type,obj) {
        if (type == null || obj == null) {
            console.log("match.sendToPlayers was given invalid arguments");
            return;
        }
        for (var i = 0; i < this.playerCount; i++) {
            var playersocket = this.players[i].socket;
            this.safeEmit(playersocket, type, obj);
        }
    }
    //Sends signal of type type to all players except for player
    //Returns nothing
    this.sendToPlayersExcept = function(username, type, obj) {
        if (username == null || type == null || obj == null) {
            console.log("match.sendToPlayersExcept was given invalid arguments");
            return;
        }
        for (var i = 0; i < this.playerCount; i++) {
            var player = this.players[i];
            if (player.username === username) {
                continue;
            }
            var playersocket = player.socket;
            this.safeEmit(playersocket, type, obj);
        }
    }
    //actionObj { "roomid" : int, "username" : string, "action" : "jump|duck|hit"}
    //Socket is the socket of the sender
    this.handlePlayerAction = function (socket, actionObj) {
        if (actionObj.username == null) {
            this.safeEmit(socket, "Player.error", { error: "Invalid username" });
            return;
        }
        if (actionObj.action == null) {
            this.safeEmit(socket, "Player.error", { error: "Invalid Player Action" });
            return;
        }
        var valid = actionObj.action.toLowerCase() === "jump";
        valid = valid || actionObj.action.toLowerCase() === "duck";
        valid = valid || actionObj.action.toLowerCase() === "hit";
        valid = valid || actionObj.action.toLowerCase() === "ducked";
        if (valid) {
            console.log("Sent %s", actionObj.action);
            this.sendToPlayersExcept(actionObj.username, "Match.playerUpdate", {
                username : actionObj.username,
                action : actionObj.action
            });
        }
        else {
            this.safeEmit(socket, "Player.error", { error: "Invalid Player Action" });
            return;
        }
        if (actionObj.action.toLowerCase() === "hit") {
            //handle the hit
            this.killPlayer(actionObj.username);
            if (this.isGameOver()) {
                this.sendGameOver(this.getWinner());
            }
        }
    }
    //boardObj { "roomid" : int, "distance" : int}
    this.getBoard = function(socket, boardObj) {
        if (boardObj.distance == null || boardObj.distance < 0) {
            this.safeEmit(socket, 'Match.error', { error : "Invalid board distance" })
        }
        else {
            this.safeEmit(socket, 'Match.boardUpdate', this.board.getSegment(boardObj.distance));
        }
    }
    //returns true/false
    this.isGameOver = function() {
        var alivePlayers = 0;
        for (var i = 0; i < this.playerCount; i++) {
            var player = this.players[i];
            if (player.alive) {
                alivePlayers++;
            }
        }
        if (alivePlayers > 1) {
            return false;
        }
        else {
            return true;
        }
    }
    this.killPlayer = function(username) {
        for (var i = 0; i < this.playerCount; i++) {
            var player = this.players[i];
            if (player.username === username) {
                player.alive = false;
                this.safeEmit(player.socket, "Player.dead", {
                    username : username
                });
                return;
            }
        }
    }
    this.getWinner = function() {
        for (var i = 0; i < this.playerCount; i++) {
            var player = this.players[i];
            if (player.alive) {
                return player.username;
            }
        }
        return null;
    }
    this.sendGameOver = function(winner) {
        console.log("%s won game %d", winner, this.roomid);
        var matchOverObj = {
            winner : winner
        };
        this.sendToPlayers("Server.endMatch", matchOverObj);
        this.playing = false;
    }
    //returns username
    this.containsSocket = function(socket) {
        for (var i = 0; i < this.playerCount; i++) {
            var player = this.players[i];
            if (player.socket === socket) {
                return player.username;
            }
        }
        return null;
    }
    //Sends a start signal to all the players and initalizes the board
    //Start obj : {roomid: int, playerCount: int, players: [usernames]}
    this.start = function() {
        //initalize the board
        //Generate start obj with board info and match info
        //Tell players the match has started
        this.sendToPlayers('Server.startMatch', this.getMatchObj());
        this.playing = true;
    }
}
exports.match = match;
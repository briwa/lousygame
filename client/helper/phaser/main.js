// TODO
// - convert everything to tile-based


CVS = {};

(function(){

	// constants
	var CVS_WIDTH = 640,
		CVS_HEIGHT = 480,
		WORLD_WIDTH = 960,
		WORLD_HEIGHT = 960,
		TILESIZE = 32,
		PLAYER_SPEED = 200; // tile per ms

	// the GAME object..... this is where it all started
	var game;

	// configs and debugs
	var config = {
		players: [],
		currentPlayer: null,
		lastClickedTile: {}
	};

	// input related
	var cursorTile;

	// --------------------------------------------------------------------------------------------------------------
	// all game related funcs START
	// ------------------------------

	function init (onAfterInit) {

		game = new Phaser.Game(CVS_WIDTH, CVS_HEIGHT, Phaser.CANVAS, 'phaser-canvas', { 
			preload: function() {
				// this is to disable pause on lost focus
				game.stage.disableVisibilityChange = true;

				// image for sprites
			    game.load.image('background','sprites/debug-grid-1920x1920.png');
			    game.load.image('player','sprites/phaser-dude.png');
			    game.load.image('cursorTile', 'sprites/default.png');

			    // for tiled maps
			    game.load.tilemap('weirdmap', 'sprites/weirdmap.json', null, Phaser.Tilemap.TILED_JSON);
			    game.load.image('tmw_desert_spacing', 'sprites/tmw_desert_spacing.png');
			}, 
			create: function() {
				// world setup
			    game.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

			    game.map = game.add.tilemap('weirdmap');
			    game.map.addTilesetImage('tmw_desert_spacing', 'tmw_desert_spacing');

			    game.layer = game.map.createLayer('Layer1');
			    game.layer2 = game.map.createLayer('Layer2');

			    // add phaser astar plugin!
			    game.astar = game.plugins.add(Phaser.Plugin.PathFinderPlugin);
			    game.astar.walkables = [10, 30];
			    game.astar.setGrid(game.map.layers[0].data, game.astar.walkables);

			    // deadzone : the middle box of which the camera shouldn't scrolling
			    // game.camera.deadzone = new Phaser.Rectangle(100, 100, DEADZONE_WIDTH, DEADZONE_HEIGHT);

			    game.input.onDown.add(onClickGameWorld, this);

			    game.input.addMoveCallback(onMoveMouse, this);

			   	cursorTile = game.add.sprite(-TILESIZE, -TILESIZE, 'cursorTile');

			    // do preparations of dynamic sprites at this point
			    onAfterInit();
			    isGameReady = true;
			}, 
		});

		// DEBUG
		window.game = game;
	}

	// ------------------------------
	// all game related funcs END
	// --------------------------------------------------------------------------------------------------------------

	// --------------------------------------------------------------------------------------------------------------
	// players funcs START
	// ------------------------------

	// the Player object
	var Player = function (user, data) {

		this.game = game;
		this.data = data;
		this.sprite = game.add.sprite( getTilePos(this.data.pos.x), getTilePos(this.data.pos.y), 'player' );
		this.user_id = user._id;

		return this;
	}

	/**
	* Find a path for the player from current position to end position using astar plugin (easystarjs)
	* then move it using tween
	* TODO: - animation when moving player
	**/
	Player.prototype.moveTo = function (endPos) {

		var self = this;

		game.astar.setCallbackFunction(function(paths) {
	    	
	    	if (paths) {
		 
		 		// reset current paths
		 		self.paths = [];

		        for(var i = 0; i < paths.length; i++) {

	            	var path = getDir( paths, i, self );
	            	
	            	if (path) {

            			var tween = game.add.tween(self.sprite);

            			tween.to({
	            			x: path.x * TILESIZE,
	            			y: path.y * TILESIZE,
	            		}, self.data.mspeed * path.dist );

	            		tween.onStart.add(function() {
	            			// sprite animation with direction goes here
	            			//if (self.paths[0])
	            				//console.log('I\'m going', self.paths[0].dir);
		        		}, game);	        	

			        	tween.onComplete.add(function() {

		        			self.paths.shift();

		        			if (self.paths[0]) {
		        				self.paths[0]._tween.start();
		        			} else {
		        				self.paths = null;
		        			}

		        		}, game);

			        	// passing path as reference
			        	tween._path = path;
		        		path._tween = tween;


		        		self.paths.push(path);

	            	}
	        	}

	        	self.paths[0]._tween.start();

	        }
        	
	    });

		var startTile = [getTile(this.sprite.x), getTile(this.sprite.y)];
		var endTile = [getTile(endPos.x), getTile(endPos.y)];

	    game.astar.preparePathCalculation(startTile, endTile);
	    game.astar.calculatePath();

	}

	/**
	* Stop to a nearest position when player on the move and wants to change direction
	* Player will move with tween to the nearest position and then execute Player.savePos for the new direction
	* then trigger another move
	**/
	Player.prototype.stopAtNearest = function (newPos) {

		console.log('INIT GOING TO NEAREST');

		if (!this.paths) return false;

		console.log('THERE IS PATH, START GOING TO NEAREST');

		var nearestTile = {};
		var duration;

		switch (this.paths[0].dir) {
			case 'up':
				nearestTile.x = this.paths[0].x;
				nearestTile.y = Math.floor( this.sprite.y / TILESIZE );
				duration = Math.abs( this.sprite.y - (nearestTile.y * TILESIZE) ) / TILESIZE;
				break;
			case 'down':
				nearestTile.x = this.paths[0].x;
				nearestTile.y = Math.ceil( this.sprite.y / TILESIZE );
				duration = Math.abs( this.sprite.y - (nearestTile.y * TILESIZE) ) / TILESIZE;
				break;
			case 'left':
				nearestTile.y = this.paths[0].y;
				nearestTile.x = Math.floor( this.sprite.x / TILESIZE );
				duration = Math.abs( this.sprite.x - (nearestTile.x * TILESIZE) ) / TILESIZE;
				break;
			case 'right':
				nearestTile.y = this.paths[0].y;
				nearestTile.x = Math.ceil( this.sprite.x / TILESIZE );
				duration = Math.abs( this.sprite.x - (nearestTile.x * TILESIZE) ) / TILESIZE;
			break;
		}

		this.paths[0]._tween.stop();
		this.paths = null;

		var self = this;

		// sometimes the difference between current pos and nearest tile is too small and will return the duration to zero
		// which means we don't need tween to go to nearest, just go straight away with new paths
		if (duration > 0) {
			var tween = game.add.tween(this.sprite);

			tween.to({
				x: nearestTile.x * TILESIZE,
				y: nearestTile.y * TILESIZE
			}, duration * this.data.mspeed);

			tween.onComplete.add(function() {

				self.moveTo(newPos);

			}, game);

			tween.start();

		} else {

			this.moveTo(newPos);
		}

	}

	// ------------------------------
	// players funcs END
	// --------------------------------------------------------------------------------------------------------------

	// --------------------------------------------------------------------------------------------------------------
	// private funcs START
	// ------------------------------

	function randomizer (value) {
		return Math.floor( Math.random() * value );
	}

	function getTilePos (rawPos) {
		return Math.floor( rawPos / TILESIZE ) * TILESIZE;
	}

	function getTile (rawPos) {
		return Math.floor( rawPos / TILESIZE );
	}

	/**
	* Find a direction and distance from one path to another
	**/
	function getDir (paths, idx, player) {

		// since astar returns the whole tile paths, we need to check
		// whether the previous path and/or the next path is going to different directions from the current path.
		// we can also call this kind of path as 'joint'.
		// this function should return a joint with contains information to tell the player position to go (x and y),
		// direction to go (up down left right) and the distance to go based on the previous joint.
		// series of paths like this will result in a chain of position that will be useful for tweening

		// the condition so that a joint can be returned is that the path :
		// (1)	has the same x different y with the previous path, but has the same y different x with the next path 
		//		(it's moving horizontally, either right or left)
		// (2)  has the same y different x with the previous path, but has the same x different y with the next path 
		//		(it's moving vertically, either up or down)
		// (3)  is the last path, bcs ofc the last path will be the last position to tween to, but we still need to check the distance and direction

		// if those conditions aren't met, there will be no path returned, but false instead. 
		// otherwise, the joint will be returned with direction and distance inside, and the joint will be pushed to player object as reference

		// (a) 	since we never returned the first path, we can't measure distance/direction between the first joint and the player original position
		//      so we used player's original position as a reference to measure first joint

		var dir,
			dist,
			mode;

		if (idx === paths.length-1) {

			// if it's a last path, bypass the check and just return the mode
			mode = (paths[idx].x === paths[idx-1].x) ? 'vert' : 'horz';

		} else 	if ( idx === 0 ) {

			// if it's a first path just return false
			return false;

		} else if (paths[idx].x === paths[idx-1].x && paths[idx].y !== paths[idx-1].y && paths[idx].x !== paths[idx+1].x && paths[idx].y === paths[idx+1].y) {
		
			// their previous path is either up or down
			mode = 'vert';

		} else if (paths[idx].x !== paths[idx-1].x && paths[idx].y === paths[idx-1].y && paths[idx].x === paths[idx+1].x && paths[idx].y !== paths[idx+1].y) {

			// their previous path is either right or left
			mode = 'horz';

		}

		if (mode) {

			// see note (a)
			var prevPath = player.paths[player.paths.length-1] || {x: getTile(player.sprite.x), y: getTile(player.sprite.y)};

			if (mode === 'horz') {

				dir = (paths[idx].x > paths[idx-1].x) ? 'right' : 'left';
				dist = Math.abs( paths[idx].x - prevPath.x );

			} else {

				dir = (paths[idx].y > paths[idx-1].y) ? 'down' : 'up';
				dist = Math.abs( paths[idx].y - prevPath.y );

			}

			paths[idx].dir = dir;
			paths[idx].dist = dist;

			return paths[idx];

		} else {

			return false;

		}

	}

	// ------------------------------
	// private funcs END
	// --------------------------------------------------------------------------------------------------------------

	// --------------------------------------------------------------------------------------------------------------
	// event funcs START
	// ------------------------------

	function onClickGameWorld (pointer, mouse) {

		// this is to decide whether we should save the newest position or not
		// we shouldn't save the position if :
		// (1)	user wants to move to same tile over and over
		// (2)	user wants to move to non-movable areas
		
		var newPos = {
			x: pointer.worldX,
			y: pointer.worldY
		};

		var newTile = {
			x: getTile(newPos.x),
			y: getTile(newPos.y),
		}

		// see note (1)
		var lastTile = config.lastClickedTile;
		if (lastTile.x === newTile.x && lastTile.y === newTile.y) return false;

		// see note (2)
		var clickedTile = game.map.layer.data[newTile.y][newTile.x];
		if (!clickedTile.properties.walkable) return false;

		onCurrentPlayerMove(newPos);

		config.lastClickedTile = newTile;

	}

	function onMoveMouse (pointer, x, y) {
		cursorTile.x = getTilePos( pointer.worldX );
		cursorTile.y = getTilePos( pointer.worldY );
	}

	function onPlayerLoggedIn(user, data) {
		// skip everything if the data isn't there
		if (!data) {
			console.warn('No user data found.');
			return;
		}

		var player = new Player(user, data);
		config.players.push(player);

		if (Meteor.userId() === user._id) {
			config.currentPlayer = player;
			game.camera.follow(config.currentPlayer.sprite);
		}
	}

	function onPlayerLoggedOut(user) {
		// get the logged out user
		var logged_out_player = _.where(config.players, {
			user_id : user._id
		}, true);

		// remove player from canvas
		logged_out_player.sprite.kill();

		config.currentPlayer = null;

		// update the array
		config.players = _.without(config.players, logged_out_player);
	}

	function onNewPlayerEvent(event) {

		if (config.players.length === 0) {
			console.warn('No players in the game');
			return;
		}

		var player = getPlayerByUserId(event.user_id);
		if (!player) {
			console.warn('Player not found.');
			return;
		}

		if (event.type === 'move') {
			var new_pos = event.attr;
			if (new_pos.x === undefined) new_pos.x = player.sprite.x;
			if (new_pos.y === undefined) new_pos.y = player.sprite.y;

			// if player.paths exist, it means it's coming from the current player itself
			if (player.paths) {
				player.stopAtNearest(new_pos);
			} else {
				// this means move another player
				player.moveTo(new_pos);
			}
		}
	}

	function onCurrentPlayerMove(pos) {
		Meteor.call('savePlayerEvent', {
			user_id : Meteor.userId(),
			type: 'move',
			attr: pos
		})
	}

	// ------------------------------
	// event funcs END
	// --------------------------------------------------------------------------------------------------------------


	function getGame() {
		return game;
	}

	function getConfig() {
		return config;
	}

	function getCurrentPlayer() {
		return game.currentPlayer;
	}

	function getPlayerByUserId(user_id) {

		if (config.players.length === 0) return false;

		return _.where(config.players, {
			'user_id' : user_id
		}, true);

	}


	CVS.MAIN = {
		init: init,

		getGame: getGame,
		getConfig: getConfig,
		getCurrentPlayer: getCurrentPlayer,
		getPlayerByUserId : getPlayerByUserId,

	};

	CVS.EVENT = {
		onPlayerLoggedIn : onPlayerLoggedIn,
		onPlayerLoggedOut : onPlayerLoggedOut,
		onNewPlayerEvent : onNewPlayerEvent
	};

})();
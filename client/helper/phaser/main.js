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
		playerpos: [],
		currentPlayerId: null,
	};
	// DEBUG
	var clicks = 0;

	// input related
	var cursors;
	var cursorTile;

	// --------------------------------------------------------------------------------------------------------------
	// all game related funcs START
	// ------------------------------

	function init (cfg) {

		game = new Phaser.Game(CVS_WIDTH, CVS_HEIGHT, Phaser.CANVAS, 'phaser-canvas', { preload: preload, create: create, update: update, render: render });

		config = cfg || config;

		// DEBUG
		window.game = game;
	}

	function preload() {

		// this is to disable pause on lost focus
		game.stage.disableVisibilityChange = true;

		// image for sprites
	    game.load.image('background','sprites/debug-grid-1920x1920.png');
	    game.load.image('player','sprites/phaser-dude.png');
	    game.load.image('cursorTile', 'sprites/default.png');

	    // for tiled maps
	    game.load.tilemap('weirdmap', 'sprites/weirdmap.json', null, Phaser.Tilemap.TILED_JSON);
	    game.load.image('tmw_desert_spacing', 'sprites/tmw_desert_spacing.png');

	}

	function create() {

		// world setup
	    //game.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'spritesheet');
	    game.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

	    game.map = game.add.tilemap('weirdmap');
	    game.map.addTilesetImage('tmw_desert_spacing', 'tmw_desert_spacing');

	    game.layer = game.map.createLayer('Layer1');
	    game.layer2 = game.map.createLayer('Layer2');

	    // add phaser astar plugin!
	    game.astar = game.plugins.add(Phaser.Plugin.PathFinderPlugin);
	    game.astar.walkables = [10, 30];
	    game.astar.setGrid(game.map.layers[0].data, game.astar.walkables);

	    // disable physics since we're using tweens
	    //game.physics.startSystem(Phaser.Physics.P2JS);

	    // deadzone : the middle box of which the camera shouldn't scrolling
	    // game.camera.deadzone = new Phaser.Rectangle(100, 100, DEADZONE_WIDTH, DEADZONE_HEIGHT);

	    // only do all player setups if there's actually player there
	    // just a precautionary methods tho, there will always be at least one player
	    if (config.players.length > 0) {

	    	// store users data to variable bcs we will totally override them
	    	// TODO: - this is completely redundant
	    	//         need to find a better way to tie up USERS to PLAYERPOS
	    	//       - NAMING CONVENTION! omg sometimes its player, sometimes its user. consistent!  
	    	var users = config.players;
	    	var userposs = config.playerpos;
	    	config.players = [];
	    	config.playerpos = [];

	    	for (var i = users.length; i--;) {
	    		var playerObj = users[i];
	    		var playerPos = _.where(userposs, {
	    			userId: playerObj._id
	    		}, true);

	    		var player = new Player( playerObj.username, playerPos, playerObj._id );
	    	}

	    	game.currentPlayer = _.where(config.players, {
	    		userId: Meteor.userId()
	    	}, true);

	    	// DEBUG
	    	game.currentPlayer.sprite.tint = Math.random() * 0xFFFFFF;

	    	game.camera.follow(game.currentPlayer.sprite);

		    game.input.onDown.add(onClickGameWorld, this);

		    game.input.addMoveCallback(onMoveMouse, this);

		    cursors = game.input.keyboard.createCursorKeys();
		   	cursorTile = game.add.sprite(-TILESIZE, -TILESIZE, 'cursorTile');
	    }
	}

	function update() {

	    //  This allows us to move the game camera using the keyboard

	    if (cursors.left.isDown)
	    {
	        game.camera.x -= 10;
	    }
	    else if (cursors.right.isDown)
	    {
	        game.camera.x += 10;
	    }

	    if (cursors.up.isDown)
	    {
	        game.camera.y -= 10;
	    }
	    else if (cursors.down.isDown)
	    {
	        game.camera.y += 10;
	    }

	}

	function render() {

	    game.debug.inputInfo(32, 32);

	}

	// ------------------------------
	// all game related funcs END
	// --------------------------------------------------------------------------------------------------------------

	// --------------------------------------------------------------------------------------------------------------
	// players funcs START
	// ------------------------------

	// the Player object
	var Player = function (name, pos, userId) {
		this.game = game;

		this.sprite = game.add.sprite( getTilePos(pos.x), getTilePos(pos.y), 'player' );
		this.userId = userId;
		this.posId = pos._id;

		this.speed = PLAYER_SPEED;

		config.players.push( this );

		return this;
	}

	// TODO
	// - animation during movement
	// - changing ALL global position to TILES
	// - we don't really have to find path just to check possible paths. disable all impossible path and walkables in click event
	//   so any clicked path will always be possible ones (and eventually saved and triggered for movement), or it won't be processed
	Player.prototype.findPathTo = function (endPos, callback) {

		// moving player to certain position using astar for pathfinding and series of tweens based on the paths 
		// first, we check if the paths are already there or not
		// (1) 	if it's there, it means it's coming from the save callback from CURRENT client
		//     	bcs CURRENT client needs to check whether the paths are ok to go or not, walkable or not.
		//		to check that, we need to run this function to generate paths
		//		if it's ok then save it to db, trigger this function and since it already has paths, run it
		// (2)  if it's not there, it means it's coming from the save callback from OTHER client
		//      we have the end of path and we know the paths are actually ok to go from the click check from OTHER client
		//      but we haven't generate the paths from them. So we generate it and run it directly after it's done

		if (this.paths) {

			this.paths[0]._tween.start();

		} else {

			console.log('START FINDING A NEW PATH');

			var self = this;

			game.astar.setCallbackFunction(function(paths) {
		    	
		    	if (paths) {

			        // DEBUG
			        // if (currentPlayer.lastPaths) {
				       //  for(var i = 0, ilen = currentPlayer.lastPaths.length; i < ilen; i++) {
			        //     	game.map.putTile(null, currentPlayer.lastPaths[i].x, currentPlayer.lastPaths[i].y, game.layer2);
			        // 	}
			        // }
			        // currentPlayer.lastPaths = paths;
			 
			 		// reset current paths
			 		self.paths = [];

			        for(var i = 0; i < paths.length; i++) {
			        	// DEBUG
		            	// game.map.putTile(15, paths[i].x, paths[i].y, game.layer2);

		            	var path = getDir( paths, i, self );
		            	
		            	if (path) {

	            			var tween = game.add.tween(self.sprite);

	            			tween.to({
		            			x: path.x * TILESIZE,
		            			y: path.y * TILESIZE,
		            		}, self.speed * path.dist );

		            		tween.onStart.add(function() {
		            			// sprite animation with direction goes here
		            			if (self.paths[0])
		            				console.log('I\'m going', self.paths[0].dir);
			        		}, game);	        	

				        	tween.onComplete.add(function() {

			        			if (self.paths) self.paths.shift();

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

		        }

		        if (callback) callback();
	        	
		    });

			var startTile = [getTile(this.sprite.x), getTile(this.sprite.y)];
			var endTile = [getTile(endPos.x), getTile(endPos.y)];

		    game.astar.preparePathCalculation(startTile, endTile);
		    game.astar.calculatePath();
		}

	}

	Player.prototype.savePos = function () {

		// do not process if theres no paths, which means the clicked tile isn't accessible
		if (!this.paths) return false;

		console.log('SAVING POS');

		var posTile = this.paths[this.paths.length-1];

		Meteor.call('updatePlayerPos', {
			userId: this.userId,
			x: posTile.x * TILESIZE,
			y: posTile.y * TILESIZE
		})

	}

	// TODO : OTHER client is acting up when changing direction
	Player.prototype.stopAtNearest = function (newPos) {
		// sometimes when user moves to one place, they tend to change their mind and move to others
		// in that case, we need to break the current tween, move the player to nearest tile, and start changing direction

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

		if (duration > 0) {
			var tween = game.add.tween(this.sprite);

			tween.to({
				x: nearestTile.x * TILESIZE,
				y: nearestTile.y * TILESIZE
			}, duration * this.speed);

			var self = this;
			tween.onComplete.add(function() {
				console.log('DONE WITH TWEENING TO NEAREST');
				self.findPathTo(newPos, function() {
					self.savePos();
				});
			}, game);

			tween.start();

		} else {
			// sometimes the difference between current pos and nearest tile is too small and will return the duration to zero
			// which means we don't need tween to go to nearest, just go straight away with new paths

			var self = this;
			this.findPathTo(newPos, function() {
				self.savePos();
			})

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

	// function to get directions from current path and path index
	function getDir (paths, idx, player) {

		// since astar returns the whole tile paths, we need to check
		// whether the previous path and/or the next path is going to different directions from the current path.
		// we can also call this kind of path as 'joint'.
		// this function should return a 'joint' with contains information to tell the player 
		// position to go (x and y), direction to go (up down left right) and the distance to go based on the previous 'joint'.
		// series of paths like this will result in a chain of position that will be useful for tweening

		// the condition so that a 'joint' can be returned is that the path :
		// (1)	has the same x different y with the previous path, but has the same y different x with the next path 
		//		(it's moving horizontally, either right or left)
		// (2)  has the same y different x with the previous path, but has the same x different y with the next path 
		//		(it's moving vertically, either up or down)
		// (3)  is the last path, bcs ofc the last path will be the last position to tween to, but we still need to check the distance and direction

		// if those conditions aren't met, there will be no path returned, but false instead. 
		// otherwise, the 'joint' will be returned and the 'joint' will be pushed to player object as reference

		// (a) 	since we never returned the first path, we can't measure distance/direction between the first 'joint' and the player original position
		//      so we used player's original position as a reference to measure first 'joint'

		var dir,
			dist,
			mode;

		if (idx === paths.length-1) {

			// if it's a last path, bypass the check and just return the mode
			mode = (paths[idx].x === paths[idx-1].x) ? 'vert' : 'horz';

		} else 	if ( idx === 0 ) {

			// if it's a first path  just return its path
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

		// DEBUG
		// clicks++;
		// console.log('CLICK NUMBER', clicks);
		// var tween = game.tweens._tweens[0];
		// console.log('TWEENS SO FAR', tween);
		// console.log('PATHS RIGHT NOW', game.currentPlayer.paths);

		// this is to decide whether we should move the player or not
		// we shouldn't move player if :
		// (1)	user wants to move to non-movable areas
		// (2)	user wants to move to same tile over and over

		var newPos = {
			x: pointer.worldX,
			y: pointer.worldY
		};

		var newPosTile = {
			x: getTile(newPos.x),
			y: getTile(newPos.y),
		};

		// see note (2)
		var clickedTile = game.map.layer.data[newPosTile.y][newPosTile.x];
		if (!clickedTile.properties.walkable) return false;

		// this is to check whether the player is currently moving or not,
		// so that we can stop current movement and make a new one if it's on the move
		if (game.currentPlayer.paths) {

			// see note (1)
			var paths = game.currentPlayer.paths;
			var destTile = {
				x: paths[paths.length-1].x,
				y: paths[paths.length-1].y
			};

			if (newPosTile.x !== destTile.x && newPosTile.y !== destTile.y) {
				game.currentPlayer.stopAtNearest(newPos);
			}

		} else {
			game.currentPlayer.findPathTo(newPos, function() {
				game.currentPlayer.savePos();
			});
		}

	}

	function onMoveMouse (pointer, x, y) {
		cursorTile.x = getTilePos( pointer.worldX );
		cursorTile.y = getTilePos( pointer.worldY );
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

	function getPlayerByPosId(posId) {

		if (config.players.length === 0) return false;

		return _.where(config.players, {
			'posId' : posId
		}, true);

	}

	var func = {
		init: init,
		preload: preload,
		create: create,
		render: render,

		getGame: getGame,
		getConfig: getConfig,
		getCurrentPlayer: getCurrentPlayer,
		getPlayerByPosId : getPlayerByPosId,

	}

	CVS.MAIN = func;

})();
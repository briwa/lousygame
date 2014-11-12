CVS = {};

(function(){

	// constants
	var CVS_WIDTH = 640,
		CVS_HEIGHT = 480,
		WORLD_WIDTH = 960,
		WORLD_HEIGHT = 960,
		TILESIZE = 32,
		PLAYER_SPEED = 500; // tile per ms

	// the GAME object..... this is where it all started
	var game;
	var currentPlayer;

	// configs and debugs
	var config = {
		players: [],
		playerpos: [],
		currentPlayerId: null,
	};

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

	    		var player = createPlayer( playerObj.username, playerPos, playerObj._id );
	    	}

	    	currentPlayer = _.where(config.players, {
	    		userId: config.currentPlayerId
	    	}, true);

	    	currentPlayer.sprite.tint = Math.random() * 0xFFFFFF;

	    	game.camera.follow(currentPlayer.sprite);

	        // should not always be tied with game tho, can be 'walkables' or some sort
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

		this.sprite = game.add.sprite( pos.x, pos.y, 'player' );
		this.userId = userId;
		this.posId = pos._id;

		this.speed = PLAYER_SPEED;
	}

	function createPlayer (name, pos, userId) {
		var player = new Player(name, pos, userId);
		config.players.push( player );

		return player;
	}

	// TODO
	// - calculate duration properly by distance travelled
	// - animation during movement
	// - of course, ASTAR. one day....

	// NOTE :
	// - hparintly tweens doesn't work if you have physics enabled, so its either physics or tweens
	function movePlayer (pos, posId) {
		if (config.players.length === 0) return;

		var player = posId ? _.where(config.players, {
			'posId' : posId
		}, true) : currentPlayer;

		var tween = game.add.tween(player.sprite);

		// skip the first one since first one is only the start
		for (i = 1; i < pos.length; i++) {
			tween.to({
				x: pos[i].x*TILESIZE, 
				y: pos[i].y*TILESIZE,
			}, 2000);
		}

		tween.start();

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

	function findPathTo (startTile, endTile, callback) {

	    game.astar.setCallbackFunction(function(paths) {
	    	
	    	if (paths) {
		    	if (callback)
		        	callback(paths);

		        // DEBUG
		        if (currentPlayer.lastPaths) {
			        for(var i = 0, ilen = currentPlayer.lastPaths.length; i < ilen; i++) {
		            	game.map.putTile(null, currentPlayer.lastPaths[i].x, currentPlayer.lastPaths[i].y, game.layer2);
		        	}
		        }

		        currentPlayer.lastPaths = paths;
		 
		 		currentPlayer.paths = [{
		 			x: startTile[0],
		 			y: startTile[1]
		 		}];

		        for(var i = 0, ilen = paths.length; i < ilen; i++) {
	            	game.map.putTile(15, paths[i].x, paths[i].y, game.layer2);

	            	var path = getDir( paths, i );
	            	if (path) 
	            		currentPlayer.paths.push( path );
	        	}

	        	currentPlayer.paths.push({
	        		x: endTile[0],
	        		y: endTile[1]
	        	});

	        	movePlayer( currentPlayer.paths );
	        }
        	
	    });

	    game.astar.preparePathCalculation(startTile, endTile);
	    game.astar.calculatePath();

	}

	function getDir (paths, idx) {
		
		// only for middle paths, not first or last
		if (!paths[idx-1] || !paths[idx+1]) return false;

		var dir;
		var dist;

		if (paths[idx].x === paths[idx-1].x && paths[idx].y !== paths[idx-1].y && paths[idx].x !== paths[idx+1].x && paths[idx].y === paths[idx+1].y) {
			
			// their previous path is either up or down
			dir = (paths[idx].y > paths[idx-1].y) ? 'down' : 'up';
			dist = Math.abs( paths[idx].y - paths[idx-1].y );

		} else if (paths[idx].x !== paths[idx-1].x && paths[idx].y === paths[idx-1].y && paths[idx].x === paths[idx+1].x && paths[idx].y !== paths[idx+1].y) {

			// their previous path is either right or left
			dir = (paths[idx].x > paths[idx-1].x) ? 'right' : 'left';
			dist = Math.abs( paths[idx].x - paths[idx-1].x );

		} 

		if (dir || dist) {
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

	// TODO: for some reason it cannot go to pos 0???
	function onClickGameWorld (pointer) {
		findPathTo( [getTile(currentPlayer.sprite.x), getTile(currentPlayer.sprite.y)],
					[getTile(pointer.worldX), getTile(pointer.worldY)] );

		Meteor.call('updatePlayerPos', {
			userId: currentPlayer.userId,
			x: getTilePos( pointer.worldX ),
			y: getTilePos( pointer.worldY )
		})
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
		return currentPlayer;
	}

	function getAstar() {
		return astar;
	}

	var func = {
		init: init,
		preload: preload,
		create: create,
		render: render,

		getGame: getGame,
		getConfig: getConfig,
		getCurrentPlayer: getCurrentPlayer,
		getAstar: getAstar,

		createPlayer : createPlayer,
		movePlayer : movePlayer
	}

	CVS.MAIN = func;

})();
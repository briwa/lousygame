Accounts.onCreateUser(function (options, user) {

	var randomizer = function (value) {
		return Math.floor( Math.random() * value );
	}

	// TODO : - 800 and 600 is supposed to be the world's size, find a way to get a global vars for client AND server
	//        - non-walkable tiles should be taken in account, so x y pos should exclude those non-walkables

	PlayerData.insert({
		user_id: user._id,
		name: 'name'+randomizer(100),
		hp: 100,
		atk: 10,
		mspeed: 100,
		pos: {
			x: 100,
			y: 100
		},
		gold: 0,
		exp: 0
	});

	return user;

});

Meteor.methods({
	savePlayerEvent: function(options) {
		PlayerEvents.insert(options);

		switch (options.type) {
			case 'move' : 
				PlayerData.update({
					user_id : options.user_id,
				}, {
					$set : {
						'pos' : options.attr
					}
				})
			break;
		}
	}
})
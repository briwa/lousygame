Meteor.startup(function() {
	PlayerEvents.remove({});
});

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
		mspeed: 200,
		pos: {
			x: 10,
			y: 10
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
				});
			break;
			case 'get_damage' : 
				var hurt_player = PlayerData.findOne({user_id: options.user_id});

				PlayerData.update({
					user_id : options.user_id,
				}, {
					$set : {
						'hp' : hurt_player.hp -= options.attr.damage
					}
				});
			break;
		}
	}
})
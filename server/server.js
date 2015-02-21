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
		name: user.username,
		hp: 100,
		atk: 10,
		atkspeed: 5,
		mspeed: 10,
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
				var damage = options.attr.damage;

				PlayerData.update({
					user_id : options.user_id,
				}, {
					$set : {
						'hp' : damage >= hurt_player.hp ? 0 : hurt_player.hp - damage
					}
				});
			break;
			case 'die' :
				var killer = PlayerData.findOne({user_id: options.attr.killer_user_id});

				PlayerData.update({
					user_id : killer.user_id,
				}, {
					$set : {
						'gold' : 250, // TODO : make it dynamic
						'exp' : killer.exp += 100 // TODO : make it dynamic
					}
				});

				var death_player = PlayerData.findOne({user_id: options.user_id});

				PlayerData.update({
					user_id : death_player.user_id,
				}, {
					$set : {
						'hp' : 100, // TODO : this value should be from max_hp
						'pos' : { // TODO : this pos should be the random respawn places
							x: 0,
							y: 0
						}
					}
				});

		}
	}
})
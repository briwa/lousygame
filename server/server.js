var randomizer = function (value) {
	return Math.floor(Math.random() * value);
}

var RESPAWN_POSITION = [{x: 1, y: 1}, {x: 28, y: 1}, {x: 28, y: 28}, {x: 1, y: 28}]; // TODO : duplicate code in client and server

Meteor.startup(function() {
	Meteor.call('clearPlayerEvents');

	// TODO : find a better way to do this
	if (MapItemData.find({}).fetch().length === 0) {
		var item_effects = [
			'hp+20',
			'hp+40',
			'hp+60',
			'hp+80',
			'hp+100',
			'atk+10',
			'atk+20',
			'atkspeed+3',
			'atkspeed+5',
			'mspeed+5',
			'mspeed+10'
		];
		
		// array of item position... shameful
		// this is a workaround so that they won't spawn to non-walkable tiles
		var item_pos = [{'x':14,'y':10},{'x':9,'y':4},{'x':23,'y':11},{'x':2,'y':21},{'x':16,'y':20},{'x':16,'y':27},{'x':21,'y':3},{'x':15,'y':0},{'x':16,'y':27},{'x':4,'y':12},{'x':25,'y':17}];

		for (var i = item_effects.length; i--;) {
			var item_effect = item_effects[i];
			MapItemData.insert({
				pos: item_pos[i],
				effect: item_effect,
				tilenum : item_effect.indexOf('hp') >= 0 ? 6 + randomizer(6) : 12 + randomizer(6),
				taken : false
			});
		}
	}

	// create dummy account every server startup
	if (Meteor.users.find({}).fetch().length === 0) {
		for (var i = 1; i <= 3; i++) {
			Accounts.createUser({
				username: 'user'+i,
				email : 'user'+i+'@admin.com',
				password: 'hahaha' 
			});
		}
	}
});

Accounts.onCreateUser(function (options, user) {
	PlayerData.insert({
		user_id: user._id,
		name: user.username,
		hp: 100,
		max_hp: 100,
		atk: 10,
		max_atk: 10,
		atkspeed: 5,
		max_atkspeed: 5,
		mspeed: 10,
		max_mspeed: 10,
		pos: RESPAWN_POSITION[randomizer(4)],
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
						'gold' : killer.gold += 250, // TODO : make it dynamic
						'exp' : killer.exp += 100 // TODO : make it dynamic
					}
				});

				var death_player = PlayerData.findOne({user_id: options.user_id});

				PlayerData.update({
					user_id : death_player.user_id,
				}, {
					$set : {
						'hp' : death_player.max_hp,
						'pos' : options.attr.next_respawn_pos
					}
				});
			break;
			case 'get_item' :
				var item_id = options.attr.item_id;
				MapItemData.update({
					_id: item_id,
				}, {
					$set: {
						'taken' : true,
						'pos' : options.attr.next_pos
					}
				});

				Meteor.setTimeout(function() {
					MapItemData.update({
						_id: item_id,
					}, {
						$set: {
							'taken' : false
						}
					});
				}, 10000); // ten seconds then revive

				// TODO : this calculation is duplicated. it also happened in client. to be refactored
				var affected_player = PlayerData.findOne({user_id: options.user_id});
				var effect = options.attr.effect.split('+');
				var effect_type = effect[0];
				var effect_amount = parseInt(effect[1]);

				var props = {};
				props[effect_type] = affected_player[effect_type] + effect_amount;

				if (props.hp > 100) props.hp = 100;

				PlayerData.update({
					user_id : affected_player.user_id,
				}, {
					$set : props
				});

				if (effect_type !== 'hp') {
					Meteor.setTimeout(function() {
						PlayerEvents.insert({
							user_id : affected_player.user_id,
							type : 'restore_status',
							attr : {
								type : effect_type
							}
						});

						props[effect_type] = affected_player['max_'+effect_type];

						PlayerData.update({
							user_id : affected_player.user_id,
						}, {
							$set : props
						});
					}, 10000);
				}
			break;

		}
	},

	clearPlayerEvents: function() {
		return PlayerEvents.remove({});
	}
});

UserStatus.events.on('connectionLogout', function(fields) { 
	var user_exceptions = ['user1', 'user2', 'user3'];
	var user = Meteor.users.findOne(fields.userId);

	if (!user.connection_out && user_exceptions.indexOf(user.username) === -1) {
		Meteor.users.update({_id : user._id}, {
			$set: {
				connection_out : true
			}
		});

		Meteor.setTimeout(function() {
			Meteor.users.update({_id : user._id}, {
				$set: {
					connection_out : false
				}
			});
		}, 10000);
	} 
});
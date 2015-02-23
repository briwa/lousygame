Meteor.publish('online_users', function() {
	return Meteor.users.find({
		'status.online' : true
	}, {
		fields: {
			connection_out : 1
		}
	});
});

Meteor.publish('all_player_data', function() {
	return PlayerData.find({});
});

Meteor.publish('all_player_events', function() {
	return PlayerEvents.find({});
});

Meteor.publish('all_map_items', function() {
	return MapItemData.find();
});
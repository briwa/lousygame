Meteor.publish('online_users', function() {
	return Meteor.users.find({
		'status.online' : true
	});
});

Meteor.publish('all_player_data', function() {
	return PlayerData.find({});
});

Meteor.publish('all_player_events', function() {
	return PlayerEvents.find({});
});
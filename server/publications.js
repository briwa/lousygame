Meteor.publish('allUser', function() {
	return Meteor.users.find({});
});

Meteor.publish('allPos', function() {
	return PlayerPos.find({});
});
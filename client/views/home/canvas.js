Template.canvas.rendered = function() {
	// WARNING : for now it is assumed the users and userpos length is the same
	var users = Meteor.users.find({});
	var player_events = PlayerEvents.find({});

	CVS.MAIN.init(function() {
		users.observe({
			added: function(user) {
				console.log('this user is already logged in', user);

				data = PlayerData.findOne({user_id: user._id});

				CVS.EVENT.onPlayerLoggedIn(user, data);
			},
			removed: function(user) {
				console.log('this user has just logged out', user);

				CVS.EVENT.onPlayerLoggedOut(user);
			},
		});
	});

	player_events.observeChanges({
		added: function(event_id, event) {
			CVS.EVENT.onNewPlayerEvent(event);
		}
	});

}
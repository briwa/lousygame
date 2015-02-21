Template.canvas.rendered = function() {
	// WARNING : for now it is assumed the users and userpos length is the same
	var users = Meteor.users.find({});
	var player_events = PlayerEvents.find({});

	CVS.MAIN.init(function() {
		users.observe({
			added: function(user) {
				// TODO : timeout needed bcs it couldn't get the Meteor.userId right
				// still not sure why
				Meteor.setTimeout(function() {
					CVS.EVENT.onPlayerLoggedIn(user, user._id === Meteor.userId());
				}, 0);
			},
			removed: function(user) {
				CVS.EVENT.onPlayerLoggedOut(user, user._id === Meteor.userId());
			},
		});
	});

	player_events.observeChanges({
		// TODO : so this added function is called for all events, the past event and the new events
		// we should exclude the past events
		added: function(event_id, event) {
			console.log(event.type);
			CVS.EVENT.onNewPlayerEvent(event);
		}
	});

}
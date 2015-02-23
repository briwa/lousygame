Template.canvas.rendered = function() {
	var users = Meteor.users.find({});
	var player_events = PlayerEvents.find({});
	var map_items = MapItemData.find({});

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
				// TODO : apparently when user refresh their browser, it's considered as logout..
				// need a better way to check it
				CVS.EVENT.onPlayerLoggedOut(user, user._id === Meteor.userId());
			},
		});

		CVS.EVENT.onInitMapItems(map_items.fetch());

		map_items.observe({
			changed: function(new_item_data, old_item_data) {
				// only do the change if the item changes from true to false
				// that means the item is revived
				// TODO : the checking can be done inside the revive function
				if (new_item_data.taken === false && old_item_data.taken === true) {
					CVS.EVENT.onReviveItem(new_item_data);
				}
			}
		})
	});

	player_events.observe({
		// TODO : so this added function is called for all events, the past event and the new events
		// we should exclude the past events
		added: function(event) {
			CVS.EVENT.onNewPlayerEvent(event);

			// clear the event after we got the information. The goal is to make the db more efficient
			// and to prevent cluttering clients data
			// TODO find a better way to do this
			Meteor.call('clearPlayerEvents');
		}
	});

}
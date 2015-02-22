Router.configure({
	layoutTemplate : 'layout'
});

Router.map(function () {
	this.route('home', {
		waitOn: function() {
			return [
				Meteor.subscribe('online_users'),
				Meteor.subscribe('all_player_events'),
				Meteor.subscribe('all_player_data'),
				Meteor.subscribe('all_map_items'),
			];
		},
		path: '/',
		render: function() {
			// clear player events everytime user refresh
			// TODO : in the future we might not need this. it's wasting resources to save each event as one row in db
			Meteor.call('clearPlayerEvents');
		}
	});
})
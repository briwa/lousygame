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
			];
		},
		path: '/'
	});
})
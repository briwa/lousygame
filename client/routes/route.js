Router.configure({
	layoutTemplate : 'layout'
});

Router.map(function () {
	this.route('home', {
		waitOn: function() {
			return [
				Meteor.subscribe('allUser'),
				Meteor.subscribe('allPos')
			];
		},
		path: '/'
	});

	this.route('login', {
		path: '/login'
	});

	this.route('signup', {
		path: '/signup'
	});

	this.route('logout', {
		path: '/logout',
		action: function() {
			Meteor.logout();
			this.redirect('/');
		}
	});
})
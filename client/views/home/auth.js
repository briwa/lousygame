Template.login.events({
	'submit #login' : function(e) {
		e.preventDefault();
		var form = $(e.target).serializeArray();
		Meteor.loginWithPassword(form[0].value, form[1].value, function(result) {
			if (result) {
				alert(result.reason);
			} else {
				Router.go('/');
			}
		});
	}
})

Template.signup.events({
	'submit #signup' : function (e) {
		e.preventDefault();
		var form = $(e.target).serializeArray();
		Accounts.createUser({
			username: form[0].value,
			email: form[1].value, 
			password: form[2].value
		}, 
		function (result) {
			if (result) {
				alert( result.reason );
			} else {
				Router.go('/');
			}
		});
	}
})

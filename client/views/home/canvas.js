Template.canvas.rendered = function() {
	// WARNING : for now it is assumed the users and userpos length is the same
	var users = Meteor.users.find({});
	var userpos = PlayerPos.find({});

	userpos.observeChanges({
		changed: function(posId, changes) {
			var currentPlayer = CVS.MAIN.getCurrentPlayer();
			if (posId !== currentPlayer.posId) {
				CVS.MAIN.movePlayer(changes, posId);
			}
		}
	})

	CVS.MAIN.init({
		players: users.fetch(),
		playerpos: userpos.fetch(),
		currentPlayerId: Meteor.userId()
	});
}
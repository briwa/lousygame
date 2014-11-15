Template.canvas.rendered = function() {
	// WARNING : for now it is assumed the users and userpos length is the same
	var users = Meteor.users.find({});
	var userpos = PlayerPos.find({});

	userpos.observeChanges({
		changed: function(posId, newPos) {
			console.log('NEW SAVE FOUND!');
			var player = CVS.MAIN.getPlayerByPosId(posId);

			if (newPos.x === undefined) newPos.x = player.sprite.x;
			if (newPos.y === undefined) newPos.y = player.sprite.y;

			if (player.paths) {
				player.stopAtNearest(newPos);
			} else {
				player.moveTo(newPos);
			}
		}
	})

	CVS.MAIN.init({
		players: users.fetch(),
		playerpos: userpos.fetch()
	});
}
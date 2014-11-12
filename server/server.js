Accounts.onCreateUser(function (options, user) {

	var randomizer = function (value) {
		return Math.floor( Math.random() * value );
	}

	// TODO : - 800 and 600 is supposed to be the world's size, find a way to get a global vars for client AND server
	//        - non-walkable tiles should be taken in account, so x y pos should exclude those non-walkables

	PlayerPos.insert({
		userId: user._id,
		x: randomizer(800),
		y: randomizer(600)
	});

	return user;

});

Meteor.methods({
	updatePlayerPos: function(obj) {
		//PlayerPos.update()
		PlayerPos.update({
			userId: obj.userId
		}, {
			$set : {
				x: obj.x,
				y: obj.y
			}
		})
	}
})
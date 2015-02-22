Template.leaderboard.helpers({
	'playerData' : function() {
		return PlayerData.find({}, {sort: {gold: -1}, limit: 3}).fetch();
	}
});
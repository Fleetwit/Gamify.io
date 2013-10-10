var _ 					= require('underscore');
/*
 * API
 */

exports.index = function(req, res){
	
	var data = {};
	if (req.route.method=='post') {
		data = _.extend({}, req.body);
	} else {
		data = _.extend({}, req.query);
		try {
			data.params = _.extend({},JSON.parse(data.params));	// get means we need to parse
		} catch(e) {}
	}
	
	
	global.user.register(data, function(token, uid) {
		if (token === false) {
			res.json({
				error:		true,
				"message":	"This account already exists."
			});
		} else {
			res.cookie('authtoken', token);
			
			// Create a default Dashboard
			var uuid = global.utils.uuid();
			global.mongo.insert("dashboards", {
				uid:		uid,
				uuid:		uuid,
				name:		"Dashboard",
				icon:		"/images/icons/woo/activity_monitor.png",
				widgets:	{}
			}, function(err, doc) {
				
			});
			
			res.json({
				authtoken:	token
			});
		}
	});
	
	
	
	
};
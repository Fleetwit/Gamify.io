var _ 					= require('underscore');
var fleetwit 			= require("fleetwit");
var userClass 			= fleetwit.users;
var users 				= new userClass();
/*
 * GET home page.
 */

exports.index = function(req, res){
	
	var data = {};
	if (req.route.method=='post') {
		data = _.extend({}, req.body);
	} else {
		data = _.extend({}, req.query);
	}
	
	
	if (req.cookies.authtoken) {
		global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
			if (response) {
				
				// List the races
				// Get the user growth
				
				
				users.getGrowth(function(points) {
					global.output.setGlobal("title","Races");
					global.output.page(req, res, {
						app:		"users",
						view:		"index.twig",
						data:		{
							growth:	points
						}
					}, []);
				});
				
				
				
			} else {
				// login page
				global.output.setGlobal("title","Login");
				global.output.page(req, res, {
					app:		"index",
					view:		"index.twig",
				}, []);
			}
		});
	} else {
		// login page
		global.output.setGlobal("title","Login");
		global.output.page(req, res, {
			app:		"index",
			view:		"index.twig",
		}, []);
	}
};
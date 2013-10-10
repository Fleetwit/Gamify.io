var _ 					= require('underscore');
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
				global.races.list(function(races) {
					global.output.setGlobal("title","Races");
					global.output.page(req, res, {
						app:		"races",
						view:		"index.twig",
						data:		{
							races: 		races,
							uuid:		data.uuid?data.uuid:false,
							selected:	data.uuid?races[data.uuid]:false,
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
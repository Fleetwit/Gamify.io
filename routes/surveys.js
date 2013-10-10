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
				global.mongoFleet.find("surveys", {survey:true}, function(surveys) {
					if (data.survey) {
						global.output.setGlobal("title","Surveys");
						global.output.page(req, res, {
							app:		"surveys",
							view:		"index.twig",
							data:		{
								step:		1,
								surveys: 	surveys,
								uuid:		data.uuid?data.uuid:false,
								selected:	data.uuid?races[data.uuid]:false,
							}
						}, ["jsurvey"]);
					} else {
						global.output.setGlobal("title","Surveys");
						global.output.page(req, res, {
							app:		"surveys",
							view:		"index.twig",
							data:		{
								step:		0,
								surveys: 	surveys,
								uuid:		data.uuid?data.uuid:false,
								selected:	data.uuid?races[data.uuid]:false,
							}
						}, ["jsurvey"]);
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
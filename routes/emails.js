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
		try {
			data.params = _.extend({},JSON.parse(data.params));	// get means we need to parse
		} catch(e) {}
	}
	
	global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
		if (response) {
			
			global.output.page(req, res, {
				app:		"emails",
				view:		"index.twig",
				data:		{
					
				}
			}, ["widgets"]);	// We need the widgetsLoader lib
			
		}
	});
	
};
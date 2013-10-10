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
	
	
	if (req.cookies.authtoken) {
		global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
			if (response) {
				
				var output = function(dashboard, dashboards) {
					console.log("Loading dashboard:",dashboard);
					global.file.listFiles("public/images/icons/woo","png", function(icons) {
						var i;
						for (i=0;i<icons.length;i++) {
							icons[i] = icons[i].substr(6);
						}
						global.output.setGlobal("title","Dashboard");
						global.output.page(req, res, {
							app:		"dashboard",
							view:		"index.twig",
							data:		{
								icons:		icons,
								dashboard:	dashboard,
								dashboards:	dashboards
							}
						}, ["widgets"]);	// We need the widgetsLoader lib
					});
				}
				
				
				if (req.params.length == 0) {
					// Find the default dashboard
					global.mongo.find("dashboards", {
						uid:	session.uid
					}, function(docs) {
						if (docs.length == 0) {
							res.json({
								error:		true,
								message:	"We couldn't find any dashboard to load. Please contact Julien."
							});
						} else {
							// output the page
							output(docs[0], docs);
						}
					});
				} else {
					// Load the requested dashboard
					global.mongo.find("dashboards", {
						uuid:	req.params[0]
					}, function(docs) {
						if (docs.length == 0) {
							res.json({
								error:		true,
								message:	"We couldn't find the requested dashboard (Dashboard #"+req.params[0]+"). Please make sure you have the right link."
							});
						} else {
							// Get the list of dashboards
							global.mongo.find("dashboards", {
								uid:	session.uid
							}, function(dashboards) {
								// output the page
								output(docs[0], dashboards);
							});
						}
					});
				}
				
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
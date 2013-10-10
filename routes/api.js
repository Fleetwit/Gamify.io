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
	console.log("method: ", data.method);
	
	switch (data.method) {
		case "register":
			global.user.register(data.params, function(token) {
				if (token === false) {
					res.json({
						error:		true,
						"message":	"This account already exists."
					});
				} else {
					res.cookie('authtoken', token);
					res.json({
						authtoken:	token
					});
				}
			});
		break;
		case "login":
			global.user.login(data.params, function(token) {
				if (token === false) {
					res.json({
						error:		true,
						"message":	"This account doesn't exist"
					});
				} else {
					res.cookie('authtoken', token);
					res.json({
						authtoken:	token
					});
				}
			});
		break;
		case "validate":
			global.user.validateAuthToken(data.params.token, function(response) {
				res.cookie('authtoken', token);
				res.json({
					valid:	response
				});
			});
		break;
		case "widget.save":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					var updateObject = {
						'$set': {
							uid:		session.uid,
							uuid:		data.params.dashboard
						}
					};
					var k;
					for (k in data.params.widgets) {
						updateObject['$set']["widgets."+k] = data.params.widgets[k];
					}
					
					
					
					global.mongo.update("dashboards", {
						uid:	session.uid,
						uuid:	data.params.dashboard
					}, updateObject, function(err, doc) {
						console.log(err, doc);
					});
					res.json(data);
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+req.cookies.authtoken+"\""
					});
				}
				
			});
		break;
		case "widget.update":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					var updateObject = {
						'$set': {
							uid:		session.uid,
							uuid:		data.params.dashboard
						}
					};
					updateObject['$set']["widgets."+data.params.widget] = data.params.value;
					
					global.mongo.update("dashboards", {
						uid:	session.uid,
						uuid:	data.params.dashboard
					}, updateObject, function(err, doc) {
						
					});
					res.json(data);
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "widget.order":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					var i;
					var updateObject = {
						'$set': {
							uid:		session.uid,
							uuid:		data.params.dashboard
						}
					};
					for (i=0;i<data.params.order.length;i++) {
						updateObject['$set']["widgets."+data.params.order[i]+".order"] = i;
					}
					
					global.mongo.update("dashboards", {
						uid:	session.uid,
						uuid:	data.params.dashboard
					}, updateObject, function(err, doc) {
						
					});
					res.json(data);
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "widget.get":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					global.mongo.find("dashboards", {
						uid:	session.uid,
						uuid:	data.params.dashboard
					}, function(docs, err) {
						
						if (docs.length > 0) {
							res.json(docs[0].widgets);
						} else {
							res.json({empty:true});
						}
					});
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "widget.remove":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					var updateObject = {
						'$unset': {}
					};
					updateObject['$unset']["widgets."+data.params.widget] = 1;
					
					
					global.mongo.update("dashboards", {
						uid:	session.uid,
						uuid:	data.params.dashboard
					}, updateObject, function(err, doc) {
						
					});
					
					res.json(data);
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "dashboard.create":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					var uuid = global.utils.uuid();
					global.mongo.insert("dashboards", {
						uid:		session.uid,
						uuid:		uuid,
						name:		data.params.name,
						icon:		data.params.icon,
						widgets:	{}
					}, function(err, doc) {
						
					});
					
					res.json({uuid: uuid,name:data.params.name,icon:data.params.icon});
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "reminder.send":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					if (data.params.testing == "true") {
						data.params.testing = true;
					} else {
						data.params.testing = false;
					}
					global.races.sendReminder(data.params.uuid, data.params.testing, function(response) {
						res.json(response);
					});
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "ranking.send":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					if (data.params.testing == "true") {
						data.params.testing = true;
					} else {
						data.params.testing = false;
					}
					
					global.races.list(function(races) {
						global.races.sendRanking(data.params.uuid, data.params.testing, function(data) {
							res.json(data);
						});
						
					});
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		case "ranking.calculate":
			global.user.validateAuthToken(req.cookies.authtoken, function(response, session) {
				if (response) {
					
					global.races.list(function(races) {
						global.races.computeRanking(data.params.uuid, function(data) {
							res.json(data);
						});
						
					});
					
				} else {
					res.json({
						error:		true,
						message:	"Invalid or expired AuthToken: \""+data.params.token+"\""
					});
				}
				
			});
		break;
		default:
			res.json({
				error:		true,
				message:	"This method doesn't exist."
			});
		break;
	}
	
	
	
};
var _ 					= require('underscore');
var qs 					= require("querystring");
var moment				= require('moment');
var request 			= require('request');

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		
		
		
		
		send: {
			require:		['tpl','params'],
			params:			{tpl:"Template UUID", params:"Mailstack parameters",test:"Bool"},
			auth:			"sys",
			description:	"Send an email ",
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					params:		'array',
					test:		'bool'
				});
				
				scope.mongo.find({
					collection: "users",
					fields:		{
						firstname:	true,
						lastname:	true,
						email:		true
					}
				}, function(users) {
					var insert = [];
					_.each(users, function(user) {
						var data = {
							user:		user,
							tpl:		params.tpl,
							type:		"fromtemplate",
							time:		new Date().getTime(),
							uuid:		Gamify.uuid.v4(),
							priority:	5,
							params:		params.params
						};
						if (params.test) {
							if (user.email == "julien@fleetwit.com" || user.email == "david@fleetwit.com") {
								insert.push(data);
							}
						} else {
							insert.push(data);
						}
						
					})
					scope.mongo.insert({
						collection:	"mailstack",
						data:		insert
					}, function(){});
					
					callback(insert);
				});
				
			}
		},
		
		
		unsubscribe: {
			require:		['email'],
			params:			{email:"Email to unsubscribe",message:"user message"},
			auth:			false,
			description:	"Send an email ",
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				request.get('https://sendgrid.com/api/unsubscribes.add.json?api_user=fleetwit&api_key=2122ftpssh808036665&email='+escape(params.email), function (error, response, body) {
					scope.mongo.insert({
						collection:	"mailstack",
						data:		{
							user:		{
								email:	"hello@fleetwit.com"
							},
							type:		"hello",
							time:		new Date().getTime(),
							uuid:		Gamify.uuid.v4(),
							priority:	5,
							params:		{
								message:	params.message,
								subject:	"[automatic-message] This user unsubscribed. Here is the reason.",
								name:		params.email,
								email:		params.email
							}
						}
					}, function(){});
					
				});
				
				callback({unsubscribed: true});
				
			}
		},
		
		
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
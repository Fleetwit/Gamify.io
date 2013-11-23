var _ 					= require('underscore');
var qs 					= require("querystring");
var moment				= require('moment');
var request 			= require('request');
var Twig				= require("twig").twig;

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		
		// Turn off the email processing
		turnoff: {
			require:		[],
			params:			{},
			auth:			'sys',
			description:	"Turn off the emails",
			status:			'prod',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				if (Gamify.settings.process_emails) {
					Gamify.settings.process_emails = false;
					Gamify.Arbiter.inform("mailstack_status", false);
				}
				
				callback({status:"off"});
				
			}
		},
		
		// Turn on the email processing
		turnon: {
			require:		[],
			params:			{},
			auth:			'sys',
			description:	"Turn off the emails",
			status:			'prod',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				if (!Gamify.settings.process_emails) {
					Gamify.settings.process_emails = true;
					Gamify.Arbiter.inform("mailstack_status", true);
				}
				
				callback({status:"on"});
				
			}
		},
		
		
		
		send: {
			require:		['type','params','target'],
			params:			{type:"Template type (alias)", params:"Mailstack parameters",target:"target: <code>all</code>, <code>registered</code>, <code>unregistered</code>",race:"targeting: race option",test:"Bool"},
			auth:			"sys",
			description:	"Send an email ",
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					params:		'object',
					test:		'bool'
				});
				
				
				var Process = function(users) {
					var insert = [];
					_.each(users, function(user) {
						var data = {
							user:		user,
							type:		params.type,
							time:		new Date().getTime(),
							uuid:		Gamify.uuid.v4(),
							priority:	5,
							params:		params.params
						};
						insert.push(data);
					});
					// if it's a test, limit to 5 emails
					if (params.test) {
						insert = insert.splice(0,5);
						// Send all of them to me
						var i;
						var l = insert.length;
						for (i=0;i<l;i++) {
							insert[i].user.email = "julien@fleetwit.com";
						}
					}
					scope.mongo.insert({
						collection:	"mailstack",
						data:		insert
					}, function(){});
					
					if (insert.length > 0) {
						callback({
							sent:	insert.length,
							params:	params,
							sample:	insert[0]
						});
					} else {
						callback({
							sent:	0,
							params:	params
						});
					}
				}
				
				
				switch (params.target) {
					case "all":
						scope.mongo.find({
							collection: "users",
							fields:		{
								firstname:	true,
								lastname:	true,
								email:		true,
								metadatas:	true
							}
						}, function(users) {
							Process(users);
						});
					break;
					
					
					case "registered":
						
						// Find the list of users who are registered to the race
						scope.mongo.distinct({
							collection:	"userlogs",
							query:		{
								action:	"race.register",
								race:	params.race
							},
							key:		"uid"
						}, function(uids) {
							
							scope.mongo.find({
								collection: "users",
								fields:		{
									firstname:	true,
									lastname:	true,
									email:		true,
									metadatas:	true
								},
								query:	{
									uid: {
										$in: uids
									}
								}
							}, function(users) {
								Process(users);
							});
						});
						
					break;
					
					
					case "unregistered":
						// Find the list of users who are registered to the race
						scope.mongo.distinct({
							collection:	"userlogs",
							query:		{
								action:	"race.register",
								race:	params.race
							},
							key:		"uid"
						}, function(uids) {
							
							scope.mongo.find({
								collection: "users",
								fields:		{
									firstname:	true,
									lastname:	true,
									email:		true,
									metadatas:	true
								},
								query:	{
									uid: {
										$nin: uids
									}
								}
							}, function(users) {
								Process(users);
							});
						});
						
					break;
				}
				
				
				
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
				
				request.get('https://sendgrid.com/api/unsubscribes.add.json?api_user=fleetwit&api_key=2122ftpssh80803666&email='+escape(params.email), function (error, response, body) {
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
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
	
	this.sms 				= require('twilio')('ACc583b91c8b44d82aae04024ad6bf3c1b', 'd9430929b6f06491ca7acd8037da7b5f');
	this.phoneNumber		= "+13478538472";
	
	// Return the methods
	var methods = {
		
		
		send: {
			require:		['message','target'],
			params:			{message:"SMS text",target:"target: <code>all</code>, <code>registered</code>, <code>unregistered</code>",race:"targeting: race option",test:"Bool"},
			auth:			"sys",
			description:	"Send an SMS",
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {});
				
				
				var send = function(phone, message, callback) {
					phone = phone.toString().replace(/[^0-9.]/g, "");
					if (phone != "") {
						console.log(">> Sending SMS to (+1"+phone+")...");
						scope.sms.sendSms({
							to:		'+1'+phone,
							from: 	scope.phoneNumber,
							body: 	message
						}, function(err, responseData) {
							if (!err) {
								callback(1, phone);
							} else {
								callback(0, phone);
							}
						});
						callback(1, phone);
					}
				}
				
				var Process = function(users) {
					var insert = [];
					if (params.test) {
						send(params.test, params.message, function(){});
						callback({
							sent:	1
						});
					} else {
						var counter = 0;
						_.each(users, function(user) {
							send(user.phone, params.message, function(i){
								counter+=i;
							});
						});
						callback({
							sent:	counter
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
								metadatas:	true,
								phone:		true
							},
							query:			{
								phone: {
									$exists: true
								}
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
									metadatas:	true,
									phone:		true
								},
								query:	{
									uid: {
										$in: uids
									},
									phone: {
										$exists: true
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
									metadatas:	true,
									phone:		true
								},
								query:	{
									uid: {
										$nin: uids
									},
									phone: {
										$exists: true
									}
								}
							}, function(users) {
								Process(users);
							});
						});
						
					break;
				}
				
				
				
			}
		}
		
		
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
var _ 					= require('underscore');
var qs 					= require("querystring");

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		users: {
			require:		[],
			auth:			"sys",
			description:	"Get user stats",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				var stats = {};
				
				// Count users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users'
					}, function(count) {
						stats.users = count;
						onProcessed();
					});
				}, {});
				
				// Count fb users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							fbuid:	{
								$exists: true
							}
						}
					}, function(count) {
						stats.fbusers = count;
						onProcessed();
					});
				}, {});
				
				// Count non-fb users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							fbuid:	{
								$exists: false
							}
						}
					}, function(count) {
						stats.nonfbusers = count;
						onProcessed();
					});
				}, {});
				
				// Demography: male
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	"male"
						}
					}, function(count) {
						stats.gender_male = count;
						onProcessed();
					});
				}, {});
				
				// Demography: female
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	"female"
						}
					}, function(count) {
						stats.gender_female = count;
						onProcessed();
					});
				}, {});
				
				// Demography: no-gender
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	{
								$exists: false
							}
						}
					}, function(count) {
						stats.nogender = count;
						onProcessed();
					});
				}, {});
				
				stack.process(function() {
					callback(stats);
				}, true);	// async
				
			}
		},
		
		race_users: {
			require:		['race'],
			auth:			"sys",
			description:	"Get user stats for a race",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				var stats = {};
				
				// Get the list of uids first
				scope.mongo.distinct({
					collection:	'userlogs',
					query:	{
						action:		"race.register",
						race:		params.race
					},
					key:	"uid"
				}, function(uids) {
					// Count users
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.users = count;
							onProcessed();
						});
					}, {});
					
					// Count fb users
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								fbuid:	{
									$exists: true
								},
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.fbusers = count;
							onProcessed();
						});
					}, {});
					
					// Count non-fb users
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								fbuid:	{
									$exists: false
								},
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.nonfbusers = count;
							onProcessed();
						});
					}, {});
					
					// Demography: male
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								"metadatas.gender":	"male",
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.gender_male = count;
							onProcessed();
						});
					}, {});
					
					// Demography: female
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								"metadatas.gender":	"female",
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.gender_female = count;
							onProcessed();
						});
					}, {});
					
					// Demography: no-gender
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								"metadatas.gender":	{
									$exists: false
								},
								uid: {
									$in:	uids
								}
							}
						}, function(count) {
							stats.nogender = count;
							onProcessed();
						});
					}, {});
					
					stack.process(function() {
						callback(stats);
					}, true);	// async
				});
				
				
				
			}
		},
		
		survey: {
			require:		['race'],
			auth:			"sys",
			description:	"Get survey stats for a race",
			params:			{race:"race's alias", query:"filter"},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				if (!params.query) {
					params.query = {}; 
				}
				
				Gamify.log("params", params);
				
				
				var stack = new Gamify.stack();
				
				
				// Get the race data
				var race = Gamify.data.races.getByAlias(params.race);
				
				// Get the survey
				var survey = race.survey;
				
				var stats 	= {};
				
				_.each(survey, function(question) {
					var i;
					for (i in question) {
						
						switch (question[i].type) {
							default:
							case "varchar":
								stack.add(function(p, onProcessed) {
									scope.mongo.distinct({
										collection:	'surveys',
										query:		_.extend({},params.query,{
											race:	params.race
										}),
										key:		"data."+i
									}, function(responses) {
										stats[p.i] = {
											type:		"list",
											label:		question[p.i].label,
											data:		responses
										}
										onProcessed();
									});
								}, {i:i});
							break;
							case "radio":
								var j;
								stats[i] = {
									type:		"list",
									label:		question[i].label,
									data:		{}
								}
								_.each(question[i].list, function(list_item) {
									stack.add(function(p, onProcessed) {
										var query = {
											race:	params.race
										};
										query["data."+i] = list_item.value;
										
										query = _.extend({},params.query,query);
										
										scope.mongo.count({
											collection:	'surveys',
											query:		query
										}, function(count) {
											
											stats[p.i].data[list_item.value] = count;
											
											onProcessed();
										});
									}, {i:i});
								});
							break;
						}
					}
				});
				
				// Process the filters
				var filters = {
					age:			[],
					agerange:		[],
					city:			[],
					country:		[],
					gender:			[],
					state:			[],
					timezone:		[],
					played_arcade:	[],
					played_live:	[]
				};
				
				var filter;
				for (filter in filters) {
					stack.add(function(p, onProcessed) {
						
						var query = {
							race:	params.race
						};
						query = _.extend({},params.query,query);
						
						Gamify.log("----------query", query);
						
						scope.mongo.distinct({
							collection:	'surveys',
							query:		query,
							key:		"metas."+p.filter
						}, function(list) {
							
							if (list.length > 0) {
								if (typeof list[0] == "number") {
									list = list.sort(function(a,b) {
										return a - b;
									});
								} else {
									list = list.sort();
								}
								
							}
							
							
							
							filters[p.filter] = list;
							onProcessed();
						});
					}, {filter:filter});
				}
				
				stack.process(function() {
					callback({
						stats:		stats,
						filters:	filters
					});
				}, true);	// async
				
			}
		},
		
		survey_explore: {
			require:		['race'],
			auth:			"sys",
			description:	"Get survey stats for a race",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				
				// Get the race data
				var race = Gamify.data.races.getByAlias(params.race);
				
				// Get the survey
				var survey = race.survey;
				
				var stats = {};
				
				_.each(survey, function(question) {
					var i;
					for (i in question) {
						
						switch (question[i].type) {
							default:
							case "varchar":
								stack.add(function(p, onProcessed) {
									scope.mongo.distinct({
										collection:	'surveys',
										query:		{
											race:	params.race
										},
										key:		"data."+i
									}, function(responses) {
										stats[i] = responses;
										onProcessed();
									});
								}, {});
							break;
							case "radio":
								var j;
								stats[i] = {};
								_.each(question[i].list, function(list_item) {
									stack.add(function(p, onProcessed) {
										var query = {
											race:	params.race
										};
										query["data."+i] = list_item.value;
										
										scope.mongo.count({
											collection:	'surveys',
											query:		query
										}, function(count) {
											stats[i][list_item.value] = count;
											onProcessed();
										});
									}, {});
								});
							break;
						}
					}
				});
				
				stack.process(function() {
					callback(stats);
				}, true);	// async
				
				/*
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							uid: {
								$in:	uids
							}
						}
					}, function(count) {
						stats.users = count;
						onProcessed();
					});
				}, {});
				*/
				
				
			}
		}
		
	};
	
	// Init a connection
	this.mongo		= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo_old	= new this.Gamify.mongo({database:'fleetwit'});
	this.mongo.init(function() {
		scope.mongo_old.init(function() {
			callback(methods);
		});
	});
}
exports.api = api;
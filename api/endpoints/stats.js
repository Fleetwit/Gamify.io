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
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				if (!params.query) {
					params.query = {}; 
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0) {
						delete params.query[i];
					}
				}
				
				
				var stack = new Gamify.stack();
				
				
				// Get the race data
				var race = Gamify.data.races.getByAlias(params.race);
				
				// Get the survey
				var survey = race.survey;
				
				var stats 	= [];
				
				_.each(survey, function(question) {
					
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
										key:		"data."+p.i
									}, function(responses) {
										stats.push({
											id:			p.i,
											type:		"list",
											islist:		true,
											label:		question[p.i].label,
											data:		responses
										});
										onProcessed();
									});
								}, {i:i});
							break;
							case "radio":
								var j;
								
								
								stack.add(function(p, onProcessed) {
									
									var buffer = {
										id:			p.i,
										type:		"radio",
										isradio:	true,
										label:		question[p.i].label,
										data:		{},
										count:		0
									};
									
									var substack = new Gamify.stack();
									
									_.each(question[p.i].list, function(list_item) {
										var query = {
											race:	params.race
										};
										query["data."+p.i] = list_item.value;
										
										query = _.extend({},params.query,query);
										
										substack.add(function(subp, onSubProcessed) {
											scope.mongo.count({
												collection:	'surveys',
												query:		subp.query
											}, function(count) {
												
												subp.buffer.data[list_item.value] = count;
												subp.buffer.count += count;
												
												onSubProcessed();
											});
										},{query:query,buffer:buffer});
										
										
									});
									
									substack.process(function() {
										stats.push(buffer);
										onProcessed();
									}, true);	// async
																		
								}, {i:i});
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
				}, false);	// sync
				
			}
		},
		
		demography: {
			require:		['collection'],
			auth:			"sys",
			description:	"Get demography stats for a race",
			params:			{collection:"Mongo Collection", query:"Filter"},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				if (!params.query) {
					params.query = {};
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0) {
						delete params.query[i];
					}
				}
				
				
				var stack = new Gamify.stack();
				
				
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
				
				var stats = {};
				for (filter in filters) {
					stack.add(function(p, onProcessed) {
						
						// db.surveys.aggregate({$match: {race: "launchrace"}}, {$project: {text: "$metas.agerange"}}, {$group: {_id: '$text', "total": {$sum: 1}}})
						scope.mongo.aggregate({
							collection:	params.collection,
							rules:		[{
								$match: params.query,
							}, {
								$project: {
									text: 	"$metas."+p.filter
								}
							}, {
								$group: {
									_id: 	'$text',
									total: 	{
										$sum: 1
									}
								}
							}]
						}, function(output) {
							Gamify.log("output", output);
							if (output && output.length > 0) {
								stats[p.filter] = {};
								_.each(output, function(line) {
									stats[p.filter][line['_id']] = line.total;
								});
							}
							
							onProcessed();
						});
					}, {filter:filter});
				}
				
				stack.process(function() {
					callback({
						stats:		stats
					});
				}, false);	// sync
				
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
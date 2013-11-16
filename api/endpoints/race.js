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
		
		create_client: {
			require:		[],
			auth:			"sys",
			description:	"Create a new client",
			params:			{},
			status:			'stable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
				params.data	= scope.Gamify.api.fixTypes(params.data, {});
				
				//console.log("PARAMS:::",params);
				
				scope.mongo.insert({
					collection:		'clients',
					data:			params.data
				}, function() {
					callback({});
					/*scope.Gamify.api.execute("race","paginate", {}, function(response) {
						callback(response[0]);
					});*/
				});
			}
		},
		
		
		create: {
			require:		['client','data'],
			auth:			"sys",
			description:	"Create a new race",
			params:			{client:'UUID of the client',data:'Race data'},
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				params["data"]	= scope.Gamify.api.fixTypes(params["data"], {
					'start_time':	'date',
					'private':		'bool'
				});
				
				var data 		= params["data"];
				data["client"]	= params["client"];
				
				scope.mongo.insert({
					collection:		'races',
					data:			data
				}, function() {
					callback({});
					/*scope.Gamify.api.execute("race","paginate", {}, function(response) {
						callback(response[0]);
					});*/
				});
			}	
		},
		
		paginate: {
			require:		[],
			auth:			false,
			description:	"Paginate the races",
			params:			{query:'MongoDB Query',sort:"Sort options",options:"Pagination options"},
			status:			'dev',
			version:		1.4,
			callback:		function(params, req, res, callback) {
				
				//console.log("\n\n\n\n\n\n\n\033[32mParams1:\033[0m",params);
				
				params	= _.extend({
					perpage:	5,
					page:		1,
					query:		{},
					sort:		{},
					options:	{}
				},params);
				
				if (params.upcoming) {
					params.query.start_time 	= {$gt:	new Date()};
					params.sort.start_time		= 1;
				}
				if (params.past) {
					params.query.start_time 	= {$lt:	new Date()};
					params.sort.start_time		= -1;
				}
				
				var paginate = function() {
					//console.log("\n\n\n\n\n\n\n\033[32mParams2:\033[0m",JSON.stringify(params,null,4));
				
					scope.mongo.paginate(_.extend(params.options,{
						collection:	"races",
						query:		_.extend({},params.query),
						sort:		_.extend({},params.sort),
						page:		params.page
					}), function(response) {
						var nextParam		= _.extend({},params);
						nextParam.page 		= response.pagination.current+1;
						var prevParam		= _.extend({},params);
						prevParam.page		= response.pagination.current-1;
						
						if (req && req.path) {
							response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
							response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
						}
						
						//*** Modify the data
						
						// Get the list of client ids
						var clientIds 	= [];
						// Get the list of race aliases
						var raceAliases = [];
						var i;
						for (i in response.data) {
							clientIds.push(response.data[i].client);
							raceAliases.push(response.data[i].alias);
						}
						clientIds 		= _.uniq(clientIds);
						raceAliases 	= _.uniq(raceAliases);
						
						var stack	= new Gamify.stack();
						
						// Get the client data
						stack.add(function(param, onProcessed) {
								
							// Get the clients now
							scope.Gamify.api.execute("client","find",{
								uuid:	{
									$in: clientIds
								}
							}, function(data) {
								// Index the data by key
								data = scope.Gamify.utils.indexed(data,'uuid');
								// Assign the data
								for (i in response.data) {
									response.data[i].client 	= data[response.data[i].client];
									response.data[i].starts_in	= new Date(response.data[i].start_time).getTime()-new Date().getTime();
									
									// Check the end time and duration
									var duration = 0;
									if (response.data[i].games && response.data[i].games.length > 0) {
										var j 	= 0;
										var l2 	= response.data[i].games.length;
										for (j=0;j<l2;j++) {
											try {
												var _settings = JSON.parse(response.data[i].games[j].settings);
											} catch (e) {}
											if (_settings && _settings.time) {
												duration += _settings.time;
											}
										}
										
									}
									response.data[i].end_time	= new Date(response.data[i].start_time+duration).getTime();
									response.data[i].ends_in	= new Date(response.data[i].start_time+duration).getTime()-new Date().getTime();
								}
								onProcessed();
								//callback(response);
							});
						});
						
						// If we are connected
						if (params.__auth) {
							// Get the race registration status
							stack.add(function(param, onProcessed) {
								scope.mongo.find({
									collection:		"userlogs",
									query:			{
										uid:	params.__auth,
										race:	{
											$in:	raceAliases
										}
									},
									fields:		{
										metas: false
									}
								}, function(registrations) {
									registrations = Gamify.utils.indexed(registrations, "race");
									
									//console.log("\n\n\n\n\n\n\n\033[32m registrations:\033[0m",registrations);
									
									// Tell if we are registered
									for (i in response.data) {
										response.data[i].state = {};
										if (registrations[response.data[i].alias]) {
											response.data[i].state.registered 	= true;
										} else {
											response.data[i].state.registered 	= false;
										}
									}
									onProcessed();
								});
							});
							
							
							// Get the best score
							stack.add(function(param, onProcessed) {
								scope.mongo.aggregate({
									collection:		"scores",
									match:			{
										$match:	{
											uid:	params.__auth,
											live:	false
										}
									},
									group:			{
										$group: {
											_id: '$race',
											total:	{
												$max:	'$result.total'
											}
										}
									}
								}, function(aggregated_data) {
									
									
									var user_scores	= Gamify.utils.indexed(aggregated_data, "_id");
									
									//console.log("\n\n\n\n\n\n\n\033[32m aggregated_data:\033[0m",aggregated_data,JSON.stringify(user_scores,null,4));
									
									
									for (i in response.data) {
										if (user_scores[response.data[i].alias] && user_scores[response.data[i].alias].total > 0) {
											response.data[i].played 	= {
												score:	user_scores[response.data[i].alias].total
											};
										} else {
											response.data[i].played 	= false;
										}
									}
									
									onProcessed();
								});
							});
						}
						
						stack.process(function() {
							callback(response);
						}, false);
					});
				};
				
				
				
				
				
				
				// Privacy
				if (params.__auth) {
					scope.Gamify.api.execute("user","find", {query:{uid: params.__auth}}, function(user_response) {
						var user = user_response[0];
						//console.log("user found:: ",user);
						if (user.email) {
							var maildomain 	= user.email.split('@');
							maildomain 		= maildomain[1];
							
							params.query	= _.extend(params.query,{
								$or: [{
									private:	false
								},{
									private:	true,
									domains:	{
										$in:	[maildomain]
									}
								}]
							});
							
							paginate();
						}
						
						
					});
				} else {
					// Only show the public races
					params.query	= _.extend(params.query,{
						private:	false
					});
					paginate();
				}
			}
		},
		
		upcoming: {
			require:		[],
			auth:			false,
			description:	"Paginated list of upcoming races",
			params:			{uid:'User\'s uid'},
			status:			'deprecated',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					query:		{},
					sort:		{},
					options:	{}
				},params);
				
				var paginate = function(query) {
					scope.Gamify.api.execute("race","paginate", _.extend({options:params.options, page:params.page, __auth:params.__auth},{
						query:	_.extend(query, {
							start_time: {
								$gt:	new Date()
							}
						}),
						sort:	{
							start_time:	1
						}
					}), callback, null, req);
				};
				
				if (params.uid) {
					// get the user's data
					scope.Gamify.api.execute("user","find", {query:{uid: params.uid}}, function(user_response) {
						var user = user_response[0];
						
						if (user.email) {
							var maildomain 	= user.email.split('@');
							maildomain 		= maildomain[1];
							var query			= {
								$or: [{
									private:	false
								},{
									private:	true,
									domains:	{
										$regex:		new RegExp('/'+maildomain+'/')
									}
								}]
							};
							
							paginate(query);
						}
						
						
					});
				} else {
					paginate({
						private:	false
					});
				}
				
				
			}
		},
		
		past: {
			require:		[],
			auth:			false,
			description:	"Paginated list of past races",
			params:			{uid:'User\'s uid',options:"Pagination options"},
			status:			'deprecated',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				
				params	= _.extend({
					query:		{},
					sort:		{},
					options:	{}
				},params);
				
				var paginate = function(query) {
					scope.Gamify.api.execute("race","paginate", _.extend({options:params.options, page:params.page, __auth:params.__auth},{
						query:	_.extend(query, {
							start_time: {
								$lt:	new Date()
							}
						}),
						sort:	{
							start_time:	-1
						}
					}), callback, null, req);
				};
				
				if (params.uid) {
					// get the user's data
					scope.Gamify.api.execute("user","find", {query:{uid: params.uid}}, function(user_response) {
						var user = user_response[0];
						
						if (user.email) {
							var maildomain 	= user.email.split('@');
							maildomain 		= maildomain[1];
							var query			= {
								$or: [{
									private:	false
								},{
									private:	true,
									domains:	{
										$regex:		new RegExp('/'+maildomain+'/')
									}
								}]
							};
							
							paginate(query);
						}
						
						
					});
				} else {
					paginate({
						private:	false
					});
				}
				
			}
		},
		
		
		get: {
			require:		[],
			auth:			false,
			description:	"Get a race's data (parameters are the query)",
			params:			{},
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				//console.log("params",params);
				scope.mongo.find({
					collection:	"races",
					query:		params
				}, function(response) {
					
					if (response && response.length > 0) {
						
						var race = response[0];
						
						// sort the games
						race.games.sort(function(a, b) {
							return a.o-b.o;
						});
						
						// Get the client
						scope.Gamify.api.execute("client","find",{
							uuid:	race.client,
						}, function(data) {
							if (data && data.length > 0) {
								race.client = data[0];
							}
							callback(race);
							
						});
						
					} else {
						callback({found:false});
					}
				});
			}
		},
		
		
		register: {
			require:		['race'],
			auth:			'authtoken',
			description:	"Deprecated. Use user.log with <code>{data:{action:'race.register',race:'race_alias'}}</code> instead.",
			params:			{race:'UUID of the race'},
			status:			'deprecated',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Are we registered yet?
				scope.Gamify.api.execute("race","is_registered", params, function(response) {
					if (!response.registered) {
						/*scope.mongo.addToSet({
							collection:	'users',
							query:		{
								uid:	params.__auth
							},
							path:		"racedata",
							data:		{
								type:	"registration",
								time:	new Date(),
								race:	params.race
							}
						}, function(response) {
							callback({registered:true});
						});*/
						scope.Gamify.api.execute("user","getMetas", {query: {uid: params.__auth}, authtoken: Gamify.settings.systoken}, function(response) {
							
						});
					} else {
						callback({registered:true,duplicate:true});
					}
				});
				
				
			}
		},
		
		
		is_registered: {
			require:		['race'],
			auth:			'authtoken',
			description:	"Check if the user is registered to the race.",
			params:			{race:'Alias of the race'},
			status:			'stable',
			version:		1.3,
			callback:		function(params, req, res, callback) {
				
				
				scope.mongo.count({
					collection:	'userlogs',
					query:		{
						uid:	params.__auth,
						race:	params.race
					},
					fields:		{
						metas:	false
					}
				}, function(count) {
					if (count > 0) {
						callback({registered: true});
					} else {
						callback({registered: false});
					}
					
				});
			}
		},
		
		
		get_registered: {
			require:		['race'],
			auth:			false,
			description:	"Check if the user is registered to the race.",
			params:			{race:'Alias of the race'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the count
				scope.mongo.count({
					collection:	'userlogs',
					query:		{
						race:	params.race
					}
				}, function(count) {
					
					// Get the uids
					scope.mongo.find({
						collection:	'userlogs',
						query:		{
							race:	params.race
						},
						fields:		{
							uid:	true,
							_id:	false
						}
					}, function(registrations) {
						var uids = [];
						var i;
						var l = registrations.length;
						for (i=0;i<l;i++) {
							uids.push(registrations[i].uid);
						}
						// Paginate the users
						scope.Gamify.api.execute("user","paginate", {query: {uid: {$in: uids}}, authtoken: Gamify.settings.systoken}, function(response) {
							callback({
								data:		response.data,
								pagination:	{
									total:	count
								}
							});
						});
					});
					
				});

			}
		},
		
		
		
		upcomingprizes: {
			require:		[],
			auth:			false,
			description:	"return an array of upcoming prizes",
			params:			{race:'Alias of the race'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the next race
				scope.Gamify.api.execute("race","upcoming", {perpage:1}, function(races) {
					if (races && races.pagination.total > 0) {
						var prizes = [];
						_.each(races.data, function(race) {
							if (race.prizes) {
								var cp = _.extend({},race);
								delete cp.prizes;
								delete cp.games;
								delete cp.description;
								delete cp.description2;
								delete cp.survey;
								_.each(race.prizes, function(prize) {
									prizes.push(_.extend({},prize, {race: cp}));
								});
							}
						});
						callback(prizes);
						
					} else {
						callback([]);
					}
				});
			}
		}
		
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database: this.Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
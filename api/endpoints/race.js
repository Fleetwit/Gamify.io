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
				
				console.log("PARAMS:::",params);
				
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
			params:			{query:'MongoDB Query'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					perpage:	5,
					page:		1,
					query:		{},
					sort:		{}
				},params);
				
				console.log("Query::",{
					collection:	"races",
					query:		_.extend({},params.query)
				});
				
				scope.mongo.paginate({
					collection:	"races",
					query:		_.extend({},params.query),
					sort:		_.extend({},params.sort)
				}, function(response) {
					var nextParam		= _.extend({},params);
					nextParam.page 		= response.pagination.current+1;
					var prevParam		= _.extend({},params);
					prevParam.page		= response.pagination.current-1;
					
					if (req && req.path) {
						response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
						response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
					}
					
					// Get the list of client ids
					var clientIds = [];
					var i;
					for (i in response.data) {
						clientIds.push(response.data[i].client);
					}
					
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
							response.data[i].client = data[response.data[i].client];
						}
						callback(response);
					});
					
					
				});
			}
		},
		
		upcoming: {
			require:		[],
			auth:			false,
			description:	"Paginated list of upcoming races",
			params:			{uid:'User\'s uid'},
			status:			'unstable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				
				var paginate = function(query) {
					scope.Gamify.api.execute("race","paginate", {
						query:	_.extend(query, {
							start_time: {
								$gt:	new Date()
							}
						}),
						sort:	{
							start_time:	1
						}
					}, callback, null, req);
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
			params:			{uid:'User\'s uid'},
			status:			'unstable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				var paginate = function(query) {
					scope.Gamify.api.execute("race","paginate", {
						query:	_.extend(query, {
							start_time: {
								$lt:	new Date()
							}
						}),
						sort:	{
							start_time:	-1
						}
					}, callback, null, req);
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
				console.log("params",params);
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
			description:	"Register a user for a race",
			params:			{race:'UUID of the race'},
			status:			'stable',
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
			params:			{race:'UUID of the race'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				console.log(">>>>>>>>>>> params",params);
				
				scope.mongo.find({
					collection:	'users',
					query:		{
						uid:	params.__auth,
						racedata: {
							$elemMatch:	{
								type:	"registration",
								race:	params.race
							}
						}
					},
					fields:		{
						racedata: {
							$elemMatch:	{
								type:	"registration",
								race:	params.race
							}
						}
					}
				}, function(response) {
					if (response.length > 0 && response[0].racedata && response[0].racedata.length > 0) {
						callback({registered: true, on: response[0].racedata[0].time});
					} else {
						callback({registered: false});
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
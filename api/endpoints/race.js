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
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {});
				
				scope.mongo.insert({
					collection:		'clients',
					data:			params
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
			auth:			false,
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
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					perpage:	5,
					page:		1
				},params);
				
				scope.mongo.paginate(_.extend({
					collection:	"races",
					query:		{}
				}, params), function(response) {
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
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					'private':		'bool'
				});
				
				scope.Gamify.api.execute("race","paginate", {
					query:	_.extend(params, {
						start_time: {
							$gt:	new Date()
						}
					}),
					sort:	{
						start_time:	1
					}
				}, callback, req);
			}
		},
		
		past: {
			require:		[],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					'private':		'bool'
				});
				
				scope.Gamify.api.execute("race","paginate", _.extend(params,{
					query:	_.extend(params, {
						start_time: {
							$lt:	new Date()
						}
					}),
					sort:	{
						start_time:	-1
					}
				}), callback, null, req);
			}
		},
		
		
		register: {
			require:		['race'],
			auth:			'authtoken',
			callback:		function(params, req, res, callback) {
				
				// Are we registered yet?
				scope.Gamify.api.execute("race","is_registered", params, function(response) {
					if (!response.registered) {
						scope.mongo.addToSet({
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
			callback:		function(params, req, res, callback) {
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
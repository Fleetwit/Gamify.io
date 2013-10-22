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
		
		
		
		
		validateAuthToken: {
			require:		['authtoken'],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				
				scope.mongo.find({
					collection:	'authtokens',
					query:		{
						token:		params['authtoken'],
						validity:	{
							$gt:	new Date().getTime()
						}
					},
					limit:	1
				}, function(response) {
					if (response.length > 0) {
						// Get user
						scope.Gamify.api.execute("user","find", {query:{uid:response[0].uid}}, function(user_response) {
							if (user_response.length > 0) {
								callback({valid: true, user: user_response[0], authtoken: params.authtoken});
							} else {
								callback({valid: false});
							}
						});
					} else {
						callback({valid: false});
					}
				});
				
			}
		},
		
		
		
		
		getAuthToken: {
			require:		['user'],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				// Convert "user" from a JSON string to an object if necessary
				params	= scope.Gamify.api.fixTypes(params, {
					user:	'object'
				});
				
				// Find the user
				// Update the token
				// Return the token
				scope.mongo.find({
					collection:	'users',
					query:		params['user'],
					limit:		1
				}, function(response) {
					if (response.length == 0) {
						callback(scope.Gamify.api.errorResponse('This user doesn\'t exist.'));
					} else {
						// Generate the token
						var authtoken = scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
						// Update/Create the token
						scope.mongo.update({
							collection:		'authtokens',
							query: {
								uid:		response[0].uid
							},
							data:	{
								uid:		response[0].uid,
								validity:	new Date().getTime()+60*60*24*365*1000,
								token:		authtoken
							},
							options:	{
								upsert:	true
							}
						},function() {
							callback({
								valid: 		true,
								authtoken:	authtoken,
								user:		response[0].uid
							});
						});
					}
				});
			}
		},
		
		
		
		
		create: {
			require:		['data'],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				params.data	= scope.Gamify.api.fixTypes(params.data, {
					password:	'md5'
				});
				
				
				var create_account = function() {
					var uid = scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
						
					scope.mongo.insert({
						collection:		'users',
						data:			_.extend(params.data, {
							uid:		uid
						})
					}, function() {
						scope.Gamify.api.execute("user","getAuthToken", {user: {uid:uid}}, function(response) {
							callback(response);
						});
					});
				}
				
				// Make sure there are no duplicate accounts
				var query = {};
				if (params.data.email && params.data.fbuid) {
					query = {
						$or:	[
							{email:	params.data.email},
							{fbuid:	params.data.fbuid},
						]
					};
				} else if (params.data.email && !params.data.fbuid) {
					query = {
						email:	params.data.email
					};
				} else if (!params.data.email && params.data.fbuid) {
					query = {
						fbuid:	params.data.fbuid
					};
				} else {
					callback(scope.Gamify.api.errorResponse('Either an email or a facebook UID is required to register an account.'));
					return false;
				}
				scope.mongo.count({
					collection:		'users',
					query:			query
				}, function(count) {
					if (count > 0) {
						callback(scope.Gamify.api.errorResponse('This account is already in use.'));
					} else {
						create_account();
					}
				});
				
			}	
		},
		
		
		
		
		find: {
			require:		[],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				scope.mongo.find(_.extend(params, {
					collection:	"users",
					fields:		{
						email:	true,
						uid:	true,
						data:	true
					}
				}), function(response) {
					callback(response);
				});
			}
		},
		
		
		
		
		get: {
			require:		[],
			auth:			'authtoken',
			callback:		function(params, req, res, callback) {
				
				scope.mongo.find(_.extend(params, {
					collection:	"users",
					query:		{
						uid:	params.__auth
					},
					limit:		1
				}), function(response) {
					if (response.length == 0) {
						callback(false);
					} else {
						callback(response[0]);
					}
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
					collection:	"users",
					query:		{}
				}, params), function(response) {
					var nextParam		= _.extend({},params);
					nextParam.page 		= response.pagination.current+1;
					var prevParam		= _.extend({},params);
					prevParam.page		= response.pagination.current-1;
					
					response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
					response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
					callback(response);
				});
			}
		},
		
		
		
		
		setlocation: {
			require:		['location'],
			auth:			"authtoken",
			callback:		function(params, req, res, callback) {
				
				// Get the location
				scope.Gamify.api.execute("geo","encode", {location: params.location}, function(response) {
					scope.mongo.update({
						collection:	"users",
						query:		{
							uid:	params.__auth	// The auth method pass that __auth data into the params
						},
						data:		{
							$set:	{
								location:	response
							}
						}
					}, function() {
						callback(response);
					});
				});
				
			}
		},
		
		
		
		
		set: {
			require:		['data'],
			auth:			"authtoken",
			callback:		function(params, req, res, callback) {
				
			
				scope.mongo.update({
					collection:	"users",
					query:		{
						uid:	params.__auth	// The auth method pass that __auth data into the params
					},
					data:		{
						$set:	params.data
					}
				}, function() {
					callback(response);
				});
				
			}
		},
		
		
		
		
		setdata: {
			require:		['data'],
			auth:			"authtoken",
			callback:		function(params, req, res, callback) {
				
				
				var data = {};
				var i;
				for (i in params.data) {
					data["data."+i] = params.data[i];
				}
			
				scope.mongo.update({
					collection:	"users",
					query:		{
						uid:	params.__auth	// The auth method pass that __auth data into the params
					},
					data:		{
						$set:	data
					}
				}, function(response) {
					callback(response);
				});
				
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
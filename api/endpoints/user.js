var _ 					= require('underscore');
var qs 					= require("querystring");
var fbapi 				= require('facebook-api');
var moment				= require('moment');

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
			description:	"",
			params:			{authtoken:'md5'},
			status:			'deprecated',
			version:		1,
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
			description:	"Identify a user and returns an authtoken to be used for private api methods.",
			params:			{user:'object'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Convert "user" from a JSON string to an object if necessary
				params	= scope.Gamify.api.fixTypes(params, {
					user:		'object'
				});
				params.user	= scope.Gamify.api.fixTypes(params.user, {
					password:	'md5'
				});
				
				console.log("params",params);
				
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
			description:	"Create a new user using arbitrary data.",
			params:			{data:'object'},
			status:			'stable',
			version:		1,
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
		
		
		
		
		facebookLogin: {
			require:		['fbuid','fbtoken'],
			auth:			false,
			description:	"Identify a user using a facebook id and authtoken, and returns an authtoken to be used for private api methods.",
			params:			{fbuid:'facebook id',fbtoken:'facebook authtoken'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Check if the fbtoken is valid
				var fbclient = fbapi.user(params.fbtoken);
				fbclient.me.info(function(err, data) {
					console.log("data",data);
					if (err) {
						callback(scope.Gamify.api.errorResponse('The facebook AuthToken used is not valid.'));
					} else {
						// Check if a user has this uid or this email
						scope.mongo.count({
							collection:	"users",
							query:		{
								$or:	[
									{fbuid:	data.id*1},		// convert to a number
									{email:	data.email}
								]
							}
						}, function(count) {
							if (count > 0) {
								// User exists, let's login and update their fb uid (just in case, as they could have an email account without that uid)
								scope.Gamify.api.execute("user","getAuthToken", {user: {fbuid:data.id*1}}, function(response) {
									callback(response);
								});
								// Background
								scope.Gamify.api.execute("user","set", {
									data: {
										fbuid:	data.id*1
									}
								}, function(response) {
									// Don't care, we won't do anything with that
								});
							} else {
								// User doesn't exist, let's create it.
								var userQuery = {
									email:		data.email,
									password:	false,	// no password!
									fbuid:		data.id*1,
									firstname:	data.first_name,
									lastname:	data.last_name
								};
								if (data.birthday) {
									userQuery.dob	= moment(data.birthday, "MM/DD/YYYY").toDate();
								}
								scope.Gamify.api.execute("user","create", {
									data: userQuery
								}, function(response) {
									callback(response);
								});
							}
						});
					}
				});
			}
		},
		
		
		
		
		find: {
			require:		[],
			params:			{},
			auth:			false,
			description:	"Search for users. Returns only the public informations.",
			status:			'unstable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				scope.mongo.find(_.extend(params, {
					collection:	"users",
					fields:		{
						email:		true,
						uid:		true,
						fbuid:		true,
						firstname:	true,
						lastname:	true,
						dob:		true,
						metadata:	true,
						data:		true
					}
				}), function(response) {
					callback(response);
				});
			}
		},
		
		
		
		
		get: {
			require:		[],
			params:			{},
			auth:			'authtoken',
			description:	"Get the user's complete profile data.",
			status:			'stable',
			version:		1,
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
			params:			{},
			auth:			false,
			description:	"Get a list of users, with pagination. Can be filtered using the 'query' parameter (object).",
			status:			'unstable',
			version:		1,
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
		
		
		
		
		online: {
			require:		[],
			params:			{},
			auth:			false,
			description:	"Get a paginated list of currently online users.",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					perpage:	5,
					page:		1,
					time:		1000*60*5	// in ms!
				},params);
				
				scope.mongo.paginate(_.extend(params, {
					collection:	"users",
					query:		{
						"data.recent_activity": {
							$gt:	new Date(new Date().getTime()-params.time)
						}
					}
				}), function(response) {
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
			params:			{},
			auth:			"authtoken",
			description:	"Set a user's location, in natural language. Example: 'Soho, New York City'. The location is geo-encoded and added to the user's meta-datas.",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the location
				scope.Gamify.api.execute("geo","encode", {location: params.location}, function(response) {
					
					// prepare the meta data
					var i;
					var metadatas = {};
					for (i in response.levels) {
						metadatas['metadata.'+i] 	= response.levels[i];
					}
					metadatas['metadata.timezone'] 	= response.timezone;
					
					scope.mongo.update({
						collection:	"users",
						query:		{
							uid:	params.__auth	// The auth method pass that __auth data into the params
						},
						data:		{
							$set:	_.extend(metadatas, {
								location:		response
							})
						}
					}, function() {
						callback(response);
					});
				});
				
			}
		},
		
		
		
		
		set: {
			require:		['data'],
			params:			{},
			auth:			"sys",
			description:	"Save a data on the user's profile.",
			status:			'stable',
			version:		1,
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
		
		
		
		
		setMetadata: {
			require:		['data'],
			params:			{},
			auth:			"authtoken",
			description:	"Save a meta-data on the user's profile.",
			status:			'stable',
			version:		1,
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
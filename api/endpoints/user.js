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
		
		
		
		
		validateAuthToken: function(params, req, res, callback) {
			
			var hasParameters = scope.Gamify.api.require(params, ['authtoken']);
			if (hasParameters !== true) {
				callback(hasParameters);
				return false;
			}
			
			scope.mongo.count({
				collection:	'authtokens',
				query:		{
					token:		params['authtoken'],
					validity:	{
						$gt:	new Date().getTime()
					}
				}
			}, function(count) {
				if (count == 0) {
					callback({valid: false});
				} else {
					callback({valid: true});
				}
			});
		},
		
		
		
		
		getAuthToken: function(params, req, res, callback) {
			
			var hasParameters = scope.Gamify.api.require(params, ['user']);
			if (hasParameters !== true) {
				callback(hasParameters);
				return false;
			}
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
		},
		
		
		
		
		create: function(params, req, res, callback) {
			
			var hasParameters = scope.Gamify.api.require(params, ['email','password']);
			if (hasParameters !== true) {
				callback(hasParameters);
				return false;
			}
			params	= scope.Gamify.api.fixTypes(params, {
				password:	'md5'
			});
			
			// Make sure there are no duplicate accounts
			scope.mongo.count({
				collection:		'users',
				query:	{
					email:	params["email"]
				}
			}, function(count) {
				if (count > 0) {
					callback(scope.Gamify.api.errorResponse('The email '+params["email"]+' is already in use.'));
				} else {
					var uid = scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
					
					scope.mongo.insert({
						collection:		'users',
						data:			_.extend(params, {
							uid:		uid
						})
					}, function() {
						scope.Gamify.api.execute("user","find", {uid: uid}, function(response) {
							callback(response[0]);
						});
					});
				}
			});
			
			
				
		},
		
		
		
		
		find: function(params, req, res, callback) {
			
			scope.mongo.find(_.extend({
				collection:	"users",
				query:		params
			}, params), callback);
				
		},
		
		
		
		
		paginate: function(params, req, res, callback) {
			
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
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:'fleetwit2'});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
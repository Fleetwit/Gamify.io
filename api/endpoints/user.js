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
		find: function(params, req, res, callback) {
			
			params	= _.extend({
				perpage:	5,
				page:		1
			},params);
			
			scope.mongo.find(_.extend({
				collection:	"datastore",
				query:		{}
			}, params), callback);
				
		},
		paginate: function(params, req, res, callback) {
			
			params	= _.extend({
				perpage:	5,
				page:		1
			},params);
			
			scope.mongo.paginate(_.extend({
				collection:	"datastore",
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
	this.mongo	= new this.Gamify.mongo({database:'fleetwit'});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
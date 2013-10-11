var _ 					= require('underscore');

// Users
function api() {
	
}
api.prototype.init = function(Gamify){
	var scope = this;
	
	this.Gamify = Gamify;
	this.ready	= false;	// If the API ready? Avoid exceptions.
	
	this.mongo	= new this.Gamify.mongo({database:'fleetwit'});
	this.mongo.init(function() {
		scope.ready = true;
	});
	
	// Return the methods
	return {
		find: function(params, callback) {
			
			params	= _.extend({
				perpage:	5,
				page:		1
			},params);
			
			if (scope.ready) {
				scope.mongo.find(_.extend(params, {
					collection:	"datastore",
					query:		{}
				}), callback);
				
			} else {
				callback(scope.Gamify.api.errorResponse('This API is not ready yet.'));
			}
		},
		paginate: function(params, callback) {
			
			params	= _.extend({
				perpage:	5,
				page:		1
			},params);
			
			if (scope.ready) {
				
				scope.mongo.paginationInfo(_.extend(params, {
					collection:	"datastore"
				}), function(response) {
					
					response.current	= params.page;
					
					scope.mongo.find(_.extend(params, {
						collection:	"datastore",
						query:		{}
					}), function(response2) {
						callback({
							pagination:	response,
							data:		response2
						});
					});
				});
				
				
			} else {
				callback(scope.Gamify.api.errorResponse('This API is not ready yet.'));
			}
		}
	};
}
exports.api = api;
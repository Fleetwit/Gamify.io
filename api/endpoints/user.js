var _ 					= require('underscore');

// Users
function api() {
	
}
api.prototype.init = function(Gamify){
	var scope = this;
	
	this.Gamify = Gamify;
	this.ready	= false;	// If the API ready? Avoid exceptions.
	
	this.mongo	= new this.Gamify.mongo({database:'em'});
	this.mongo.init(function() {
		scope.ready = true;
	});
	
	// Return the methods
	return {
		find: function(params, callback) {
			
			params	= _.extend(params, {
				limit:		1
			});
			
			if (scope.ready) {
				scope.mongo.find(_.extend(params, {
					collection:	"events",
					query:		{}
				}), callback);
				
			} else {
				callback(scope.Gamify.api.errorResponse('This API is not ready yet.'));
			}
		}
	};
}
exports.api = api;
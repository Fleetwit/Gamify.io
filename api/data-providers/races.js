var _ 					= require('underscore');

exports.dataProvider = function (Gamify) {
	
	Gamify.data.races = new (function() {
		
		var scope 			= this;
		
		this.racesAlias 	= {};
		this.racesUuids 	= {};
		
		this.refresh = function(callback) {
			scope.mongo.find({
				collection:	"races",
				limit:		500
			}, function(response) {
				
				// Get the clients
				var clientIds = [];
				var i;
				for (i in response) {
					clientIds.push(response[i].client);
				}
				clientIds = _.uniq(clientIds);
				
				// Get the clients now
				Gamify.api.execute("client","find",{
					uuid:	{
						$in: clientIds
					}
				}, function(data) {
					// Index the data by key
					data = Gamify.utils.indexed(data,'uuid');
					// Assign the data
					for (i in response) {
						response[i].client = data[response[i].client];
					}
					
					// Save the data
					scope.racesAlias = Gamify.utils.indexed(response, "alias");
					scope.racesUuids = Gamify.utils.indexed(response, "uuid");
					
					this.timer = setTimeout(function() {
						scope.refresh();
					}, Gamify.settings.race_update_interval);
				});
				
				
				
				
			});
		};
		this.getByAlias = function(alias) {
			if (scope.racesAlias[alias]) {
				//console.log("Alias: ",alias, JSON.stringify(scope.racesAlias[alias],null,4));
				return scope.racesAlias[alias];
			} else {
				return false;
			}
		};
		this.getByUuid = function(uuid) {
			if (scope.racesUuids[uuid]) {
				return scope.racesUuids[uuid];
			} else {
				return false;
			}
		};
		
		this.mongo	= new Gamify.mongo({database: Gamify.settings.db});
		this.mongo.init(function() {
			scope.refresh();
		});
		
	})();
	
	
	
	
	
	
	
	
	
	// Old races
	Gamify.data.oldraces = new (function() {
		
		console.log("Old race init");
	
		var scope 			= this;
		
		this.racesAlias 	= {};
		this.racesUuids 	= {};
		
		this.refresh = function(callback) {
			scope.mongo.find({
				collection:	"clients",
				limit:		500
			}, function(response) {
				
				
				var clients = response[0].data.clients;
				var races = [];
				
				_.each(clients, function(client) {
					if (client.races && client.races.length > 0) {
						_.each(client.races, function(race) {
							race.client = client;
							races.push(race);
						});
					}
					
				});
				
				// Save the data
				scope.racesAlias = Gamify.utils.indexed(races, "alias");
				scope.racesUuids = Gamify.utils.indexed(races, "uuid");
				
				this.timer = setTimeout(function() {
					scope.refresh();
				}, Gamify.settings.race_update_interval);
			
				
			});
		};
		this.getByAlias = function(alias) {
			if (scope.racesAlias[alias]) {
				//console.log("Alias: ",alias, JSON.stringify(scope.racesAlias[alias],null,4));
				return scope.racesAlias[alias];
			} else {
				return false;
			}
		};
		this.getByUuid = function(uuid) {
			if (scope.racesUuids[uuid]) {
				return scope.racesUuids[uuid];
			} else {
				return false;
			}
		};
		
		this.mongo	= new Gamify.mongo({database: "fleetwit"});
		this.mongo.init(function() {
			scope.refresh();
		});
		
	})();
};
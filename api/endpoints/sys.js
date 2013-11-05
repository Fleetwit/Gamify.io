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
		
		
		
		
		importRaces: {
			require:		[],
			auth:			'sys',
			description:	"Import the races from the old Fleetwit database to the new one (currently '"+Gamify.settings.db+"')",
			params:			{},
			status:			'unstable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
				// Reset the data
				scope.mongo.remove({
					collection:	'clients'
				}, function() {
					console.log("\033[33mClients\033[0m removed.");
					scope.mongo.remove({
						collection:	'races'
					}, function() {
					console.log("\033[33mRaces\033[0m removed.");
						
						// Find the original race data
						scope.mongo_old.find({
							collection:	'clients',
							query:		{}
						}, function(clients) {
							// Now we have the clients.
							// Let's register them.
							var i;
							var stack	= new Gamify.stack();
							
							console.log("clients",clients[0].data.clients.length);
							console.log("\033[33m"+clients[0].data.clients.length+"\033[0m clients found.");
							
							for (i=0;i<clients[0].data.clients.length;i++) {
								stack.add(function(params, onProcessed) {
									
									// remove the races from the client data
									delete params.client.races;
									
									scope.Gamify.api.execute("race","create_client", {data:params.client, authtoken:Gamify.settings.systoken}, function(exec_response) {
										var stackRace	= new Gamify.stack();
										var j;
										
										if (params.races && params.races.length) {
											
											console.log("\033[33m"+params.races.length+"\033[0m races found for client \033[33m",params.client.name,"\033[0m");
											
											for (j=0;j<params.races.length;j++) {
												
												stackRace.add(function(params2, onProcessed) {
													
													// Copy the prizes to .prize (rename the variable)
													params2.race.prizes = params2.race.prices;
													
													// Delete the prizes
													delete params2.race.prices;
													
													// Get the surveys if there are some
													scope.mongo_old.find({
														collection:	'surveys',
														query:		{
															id:		params2.race.survey
														}
													}, function(surveys) {
														if (surveys && surveys.length > 0) {
															var survey = surveys[0];
															params2.race.survey = survey;
														} else {
															params2.race.survey = [];
														}
														
														scope.Gamify.api.execute("race","create", {
															client:		params.client.uuid,
															data:		params2.race,
															authtoken:	Gamify.settings.systoken
														}, function(exec_response2) {
															onProcessed();
														});
													});
													
													
												}, {race: params.races[j]});
												
											}
											stackRace.process(function() {
												console.log("\t> All races processed.");
												onProcessed();
											}, false);
										} else {
											console.log("No races found for client \033[33m",params.client.name,"\033[0m");
											onProcessed();
										}
										
									});
								},{client:_.extend({},clients[0].data.clients[i]), races: clients[0].data.clients[i].races});
							}
							stack.process(function() {
								callback({done: true});
							}, false);
						});
						
						
					});
				});
				
				

				
			}
		}
		
	};
	
	// Init a connection
	this.mongo		= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo_old	= new this.Gamify.mongo({database:'fleetwit'});
	this.mongo.init(function() {
		scope.mongo_old.init(function() {
			callback(methods);
		});
	});
}
exports.api = api;
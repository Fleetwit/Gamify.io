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
					//console.log("\033[33mClients\033[0m removed.");
					scope.mongo.remove({
						collection:	'races'
					}, function() {
					//console.log("\033[33mRaces\033[0m removed.");
						
						// Find the original race data
						scope.mongo_old.find({
							collection:	'clients',
							query:		{}
						}, function(clients) {
							// Now we have the clients.
							// Let's register them.
							var i;
							var stack	= new Gamify.stack();
							
							//console.log("clients",clients[0].data.clients.length);
							//console.log("\033[33m"+clients[0].data.clients.length+"\033[0m clients found.");
							
							for (i=0;i<clients[0].data.clients.length;i++) {
								stack.add(function(params, onProcessed) {
									
									// remove the races from the client data
									params.client = _.extend({},params.client);
									delete params.client.races;
									
									scope.Gamify.api.execute("race","create_client", {data:params.client, authtoken:Gamify.settings.systoken}, function(exec_response) {
										var stackRace	= new Gamify.stack();
										var j;
										
										if (params.races && params.races.length) {
											
											//console.log("\033[33m"+params.races.length+"\033[0m races found for client \033[33m",params.client.name,"\033[0m");
											
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
												//console.log("\t> All races processed.");
												onProcessed();
											}, false);
										} else {
											//console.log("No races found for client \033[33m",params.client.name,"\033[0m");
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
		},
		
		
		
		
		
		
		importReg: {
			require:		[],
			auth:			'sys',
			description:	"",
			params:			{},
			status:			'dev',
			version:		0.1,
			callback:		function(params, req, res, callback) {
				
				scope.mongo_old.find({
					collection:	'datastore',
					query:		{
						//uid:	9
					}
				}, function(oldusers) {
					
					console.log("oldusers imported: ",oldusers.length);
					
					var __stats = {};
					
					var importStack = new Gamify.stack();
					
					
					_.each(oldusers, function(olduser) {
						
						importStack.add(function(params, onProcessed) {
							
							// Get the user's SQL data
							Gamify.sql.query("select * from users where id="+params.olduser.uid, function(err, rows, fields) {
								if (!err && rows.length > 0 && rows[0].id > 0) {
									// extend the user's local data
									params.olduser.sql 		= rows[0];
									params.olduser.email 	= rows[0].email;
							
							
									// Get the user's uid
									if (params.olduser.email) {
										scope.mongo.find({
											collection:	"users",
											query:	{
												email:	params.olduser.email
											}
										}, function(users) {
											
											console.log("users found:",users.length);
											
											if (users.length > 0) {
												
												// save the new uid as "uuid"
												params.olduser.uuid = users[0].uid;
												
												
												// Add each user import op to a new layer in the stack
											
												
												if (params.olduser.racedata && params.olduser.racedata.length > 0) {
													
													var groupedData = _.groupBy(params.olduser.racedata, function(item) {
														return item["race"];
													});
													
													
													_.each(params.olduser.racedata, function(racereg) {
														if (racereg.type && racereg.type == "registration") {
															// Register for the race
															console.log(params.olduser.email+" -> "+Gamify.data.oldraces.getByUuid(racereg.race).alias);
															
															scope.Gamify.api.execute("user","log", {
																authtoken:		Gamify.settings.systoken,
																__auth:			params.olduser.uuid,
																__authcheck:	Gamify.settings.systoken,
																data:			{
																	action:	"race.register",
																	race:	Gamify.data.oldraces.getByUuid(racereg.race).alias
																}
															}, function(response) {
																if (!__stats[params.olduser.email]) {
																	__stats[params.olduser.email] = [];
																}
																__stats[params.olduser.email].push(Gamify.data.oldraces.getByUuid(racereg.race).alias);
																
															});
														}
														
													});
													
													onProcessed();
												} else {
													onProcessed();
												}
															
													
												//
											} else {
												onProcessed();
											}
										});
									} else {
										onProcessed();
									}
								} else {
									onProcessed();
								}
							});
						},{olduser: olduser});
					});
					
					
					importStack.process(function() {
						console.log("Finished.",__stats);
						callback(__stats);
					}, true);	// Async
					
				});
			}
		},
		
		
		
		
		
		importUsers: {
			require:		[],
			auth:			'sys',
			description:	"Import the users from the old Fleetwit database to the new one (currently '"+Gamify.settings.db+"')",
			params:			{},
			status:			'unstable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
				var notfound = [];
				var __stats = {
					imported:	0,
					duplicates:	[]
				};
				
				var removeList = ["users","scores","achievements","userlogs","authtokens","challenges","fbinvites"];
				
				// Reset the data
				var removeStack = new Gamify.stack();
				_.each(removeList, function(item) {
					removeStack.add(function(params, onProcessed) {
						scope.mongo.remove({
							collection:	item
						}, function() {
							onProcessed();
						});
					});
				});
				
				removeStack.process(function() {
					// Import the users
					scope.mongo_old.find({
						collection:	'datastore',
						query:		{
							//uid:	9
						},
						//limit:		5
					}, function(oldusers) {
						
						var importStack = new Gamify.stack();
						_.each(oldusers, function(olduser) {
							
							// Add each user import op to a new layer in the stack
							importStack.add(function(params, onProcessed) {
								
								// Get the user's SQL data
								Gamify.sql.query("select * from users where id="+params.olduser.uid, function(err, rows, fields) {
									if (!err && rows.length > 0 && rows[0].id > 0) {
										// extend the user's local data
										params.olduser.sql = rows[0];
										
										
										// Import Ops
										// Dedicated sub-stack
										var opStack = new Gamify.stack();
										
										// Create the user
										opStack.add(function(params2, onProcessed) {
											var userData = {
												register_date:	 new Date(params.olduser.sql.register_date*1000),
												firstname:		params.olduser.sql.firstname,
												lastname:		params.olduser.sql.lastname,
												email:			params.olduser.sql.email
											};
											// Add the facebook id
											if (params.olduser.sql.uid > 0) {
												userData.fbuid = params.olduser.sql.uid;
											}
											// Add the password
											if (params.olduser.sql.password && params.olduser.sql.password != "") {
												userData.password = params.olduser.sql.password;
											}
											// Add the phone
											if (params.olduser.sql.phone && params.olduser.sql.phone != "Phone number" && params.olduser.sql.phone != "") {
												userData.phone = params.olduser.sql.phone;
											}
											// Add the avatar
											if (params.olduser.sql.avatar && params.olduser.sql.avatar != "") {
												userData.avatar = params.olduser.sql.avatar_large;
											}
											
											
											// Create the user
											scope.Gamify.api.execute("user","create", {data:userData, __passwordencoded:true}, function(response) {
												
												// Error? Duplicate account?
												if (response.error && response.error.number == 304) {	// already exist
													// Merge the account
													// Find the account
													var searchQuery;
													if (userData.email && userData.fbuid) {
														searchQuery = {
															$or:	[
																{email:	userData.email},
																{fbuid:	userData.fbuid},
															]
														};
													} else if (userData.email && !userData.fbuid) {
														searchQuery = {
															email:	userData.email
														};
													} else if (!userData.email && userData.fbuid) {
														searchQuery = {
															fbuid:	userData.fbuid
														};
													}
													
													scope.mongo.find({
														collection:	'users',
														query:		searchQuery
													}, function(queryResponse) {
														if (queryResponse.length > 0) {
															// Save the uid of the duplicate account, we'll merge the info later
															params.olduser.mergedwith = queryResponse[0].uid;
														} else {
															console.log("\033[35m Creating user [ERROR] [response]:\033[37m","Duplicate user not found.");
														}
													});
													__stats.duplicates.push(searchQuery);
												} else {
													__stats.imported++;
												}
												
												console.log("\033[35m [Response] [response]:\033[37m",response);
												params.olduser.authtoken	= response.authtoken;
												params.olduser.uuid			= response.user;
												onProcessed();
											});
										}, {});
										
										
										// Update the user (to give achievements)
										opStack.add(function(params2, onProcessed) {
											var userData = {};
											
											// Add the gender
											if (params.olduser.sql.gender && params.olduser.sql.gender > 0) {
												userData.gender 	= params.olduser.sql.gender;
											}
											// Add the dob
											if (params.olduser.sql.dob && params.olduser.sql.dob > 0) {
												userData.dob 	= params.olduser.sql.dob;
											}
											// Add the location
											// Deactivated to not exhaust google's limit
											/*if (params.olduser.sql.city && params.olduser.sql.city != "") {
												userData.location 	= params.olduser.sql.location;
											}
											// ... location: Better data if available
											if (params.olduser.publicdata && params.olduser.publicdata.location) {
												userData.location 	= params.olduser.publicdata.location.city+", "+params.olduser.publicdata.location.state+" "+params.olduser.publicdata.location.country;
											}*/
											// Add the timezone
											if (params.olduser.sql.timezone && params.olduser.sql.timezone != "") {
												userData.timezone 	= params.olduser.sql.timezone;
											}
											userData.authtoken		= params.olduser.authtoken;
											userData.__auth 		= params.olduser.uuid;
											userData.__authcheck	= Gamify.settings.systoken;
											
											// Update the user
											scope.Gamify.api.execute("user","update", userData, function(response) {
												
												onProcessed();
											});
										}, {});
										
										
										// Register the user to his races
										opStack.add(function(params2, onProcessed) {
											if (params.olduser.racedata && params.olduser.racedata.length > 0) {
												
												// Group the data
												//var groupedData = Gamify.utils.group(params.olduser.racedata, ["race","level"]);
												
												
												var groupedData = _.groupBy(params.olduser.racedata, function(item) {
													return item["race"];
												});
												
												var i;
												for (i in groupedData) {
													groupedData[i] = _.groupBy(groupedData[i], function(subitem) {
														return subitem["level"];
													});
												}
												
												console.log("\033[35m [groupedData]:\033[37m",groupedData);
												
												
												
												_.each(params.olduser.racedata, function(racereg) {
													if (racereg.type && racereg.type == "registration") {
														// Register for the race
														scope.Gamify.api.execute("user","log", {
															authtoken:		params.olduser.authtoken,
															__auth:			params.olduser.uuid,
															__authcheck:	Gamify.settings.systoken,
															action:			"race.register",
															race:			Gamify.data.oldraces.getByUuid(racereg.race).alias
														}, function(response) {
															
															onProcessed();
														});
													} else if (racereg.type && racereg.type == "data" && racereg.level*1 == 0) {
														// Start a new game
														scope.Gamify.api.execute("game","register", {
															authtoken:		params.olduser.authtoken,
															__auth:			params.olduser.uuid,
															__authcheck:	Gamify.settings.systoken,
															alias:			Gamify.data.oldraces.getByUuid(racereg.race).alias,
															live:			true,
															force_entry:	true,	// Force the race to start (because the live race is expired)
															imported:		true
														}, function(game_response) {
															if (game_response.token) {
																
																// Start the race
																scope.Gamify.api.execute("game","start", {
																	authtoken:		params.olduser.authtoken,
																	__auth:			params.olduser.uuid,
																	__authcheck:	Gamify.settings.systoken,
																	token:			game_response.token
																}, function(start_response) {
																	
																	
																	
																	
																	var subopStack = new Gamify.stack();
																	
																	
																	
																	if (groupedData[racereg.race]) {
																		var levels = groupedData[racereg.race];
																		for (level in levels) {
																			
																			if (level*1 > 0) {
																				subopStack.add(function(params3, onProcessed) {
																					console.log("processing params3.level #"+params3.level, JSON.stringify(params3.levels[params3.level], null, 4));
																					if (params3.levels[params3.level][0].data) {
																						console.log("#"+params3.level+" -> Step 1");
																						try {
																							
																							scope.Gamify.api.execute("game","sendscore", {
																								authtoken:		params.olduser.authtoken,
																								__auth:			params.olduser.uuid,
																								__authcheck:	Gamify.settings.systoken,
																								token:			game_response.token,
																								level:			params3.level*1,
																								score:			params3.levels[params3.level][0].data.rawscore,
																								time:			params3.levels[params3.level][0].data.ms,
																								sent:			"import",
																								data:			params3.levels[params3.level][0].data
																							}, function(game_response) {
																								onProcessed()
																							});
																						} catch(e) {
																							console.log("\033[35m [ERROR]:\033[37m",params3.levels[params3.level][0]);
																						}
																					} else if (params3.levels[params3.level][0].rawscore && params3.levels[params3.level][0].ms) {
																						console.log("#"+params3.level+" -> Step 2");
																						try {
																							scope.Gamify.api.execute("game","sendscore", {
																								authtoken:		params.olduser.authtoken,
																								__auth:			params.olduser.uuid,
																								__authcheck:	Gamify.settings.systoken,
																								token:			game_response.token,
																								score:			params3.levels[params3.level][0].rawscore,
																								time:			params3.levels[params3.level][0].ms,
																								sent:			"import",
																								data:			(params3.levels[params3.level][0].data )?params3.levels[params3.level][0].data:{}
																							}, function(game_response) {
																								onProcessed()
																							});
																						} catch(e) {
																							console.log("\033[35m [ERROR]:\033[37m",params3.levels[params3.level][0]);
																						}
																					} else {
																						console.log("#"+params3.level+" -> FAILED");
																						onProcessed()
																					}
																				},{level:level,levels:levels});
																			}
																		}
																		
																		subopStack.process(function() {
																			// End the game
																			scope.Gamify.api.execute("game","end", {
																				authtoken:		params.olduser.authtoken,
																				__auth:			params.olduser.uuid,
																				__authcheck:	Gamify.settings.systoken,
																				token:			game_response.token
																			}, function(game_response) {
																				onProcessed();
																			});
																		}, false);	// Sync
																		
																		
																	} else {
																		// race not found
																	}
																	
																});
																
																
															}
															// -> onProcessed();
														});
													}
													// ignore the rest, we'll process in order
												});
											}
										}, {});
										
										opStack.process(function() {
											onProcessed();
										}, false);	// Sync
									} else {
										console.log("USER NOT FOUND: #",params.olduser.uid);
										notfound.push(params.olduser.uid);
									}
								});
								
							},{olduser: olduser});
						});
						
						
						importStack.process(function() {
							console.log("Finished.",__stats);
							callback(__stats);
						}, true);	// Async
						
					});
				}, true);	// async, order doesn't matter
				
				
				
				
			}
		},
		
		
		
		
		
		
		fixRanking: {
			require:		['race'],
			auth:			'sys',
			description:	"",
			params:			{},
			status:			'dev',
			version:		0.1,
			callback:		function(params, req, res, callback) {
				
				
				var stack = new Gamify.stack();
				
				// Find the duplicates
				scope.mongo.aggregate({
					collection:	"scores",
					rules:		[{
						$match: {
							race:	params.race,
							live:	true
						}
					}, {
						$project: {
							text: 	"$uid"
						}
					}, {
						$group: {
							_id: 	'$text',
							total: 	{
								$sum: 1
							}
						}
					}]
				}, function(output) {
					
					var removed = [];
					
					_.each(output, function(line) {
						if (line.total > 1) {
							stack.add(function(p, onProcessed) {
								// Find the scores
								scope.mongo.find({
									collection:		"scores",
									query:		{
										race:	params.race,
										live:	true,
										uid:	p.uid
									},
									sort:	{
										registered:	1
									},
									fields:	{
										token:	1
									}
								}, function(scores) {
									var tokens = [];
									// List the tokens
									_.each(scores, function(scoreline) {
										tokens.push(scoreline.token);
									});
									
									// Remove the first one (we keep it)
									tokens = tokens.slice(1);
									removed.push(tokens);
									// Delete the tokens
									scope.mongo.remove({
										collection:		"scores",
										query:			{
											race:	params.race,
											live:	true,
											uid:	p.uid,
											token:	{
												$in:	tokens
											}
										},
									}, function() {
										onProcessed();
									});
								});
							},{uid: line._id});
						}
					});
					
					stack.process(function() {
						callback(removed);
					}, true);	// async
				});
				
				
			}
		},
		
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
var _ 					= require('underscore');
var qs 					= require("querystring");

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify 		= Gamify;
	this.collections	= {
		scores:				"scores",
		user:				"users",
		challenges:			"challenges"
	};
	
	// Return the methods
	var methods = {
		
		
		register: {
			require:		['alias','live'],
			auth:			'authtoken',
			description:	"Start a new game. Returns a game token, required to send scores, end the game, and other game-specific functions.",
			params:			{alias:"string - Alias of the race",live:"Bool - <code>false</code> Arcade mode or <code>true</code>Live race"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					live: 'bool'
				});
				var token 	= scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
				
				var race	= Gamify.data.races.getByAlias(params.alias);
				
				if (!race) {
					callback(Gamify.api.errorResponse("This race doesn't exist"));
					return false;
				}
				
				//console.log("race",JSON.stringify(race,null,4));
				
				// Calculate the duration
				var i;
				var l = race.games.length;
				var duration = 0;
				for (i=0;i<l;i++) {
					var settings 	= JSON.parse(race.games[i].settings);
					var _duration	= settings.time;
					if (!_duration) {
						_duration = 180;
					}
					duration += _duration;
				}
				
				// Get the user data first
				scope.Gamify.api.execute("user","find", {query:{uid: params.__auth}}, function(user_response) {
					
					var user = user_response[0];
					
					var starts_in	= Gamify.settings.default_race_time;		// Default timer
					var can_play	= true;
					
					// Check if the race is live
					var race = Gamify.data.races.getByAlias(params.alias);
					//console.log(">>>>>>>>>>>",JSON.stringify(race, null, 4));
					// Does the race exists?
					if (race) {
						var race_starts_in	= new Date(race.start_time).getTime()-new Date().getTime();
						// live race? Make sure you are not too late
						if (params.live == true) {
							// If you're too late, you can't play!
							if (race_starts_in < (Gamify.settings.max_min_late*60*1000)*-1 && !params.force_entry) {	// param "force_entry" allows to play an expired live race.
								can_play = false;
							}
							starts_in 			= race_starts_in;
						} else {
							// Not a live race. Make sure the user is not trying to play a future race tho.
							if (race_starts_in > 0) {
								// Race is in the future!
								can_play = false;
							}
						}
					}
					
					scope.mongo.insert({
						collection:	scope.collections.scores,
						data:		{
							uid:		params.__auth,
							race:		params.alias,
							live:		params.live,
							maxtime:	duration*1000,
							registered:	new Date(),
							late:		starts_in<0,
							snapshot:	starts_in,
							started:	false,
							ended:		false,
							token:		can_play?token:false,		// Game token, used to submit scores
							scores:		[],
							imported:	params.imported?true:false,
							result:	{
								score:		0,
								time:		0,
								multiplier:	0,
								total:		0
							},
							metas:		_.extend({},user.metas)
						}
					}, function(response) {
						callback({
							token:		can_play?token:false,	// No token if you can't play!
							timer:		starts_in,
							can_play:	can_play
						});
					});
				});
			}
		},
		
		
		
		
		
		start: {
			require:		['token'],
			auth:			'authtoken',
			description:	"Start the timer.",
			params:			{token:"Game token, returned by game.start"},
			status:			'stable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
				var started = new Date();
				
				scope.mongo.update({
					collection:	scope.collections.scores,
					query:		{
						token:	params.token,
						uid:	params.__auth
					},
					data:		{
						$set:	{
							started:	started
						}
					}
				}, function(query_output) {
					callback({started: started});
				});
			}
		},
		
		
		
		
		
		
		
		
		/*
		*	game.sendscore is used to receive the score and time per level. It requires a game token.
		*/
		sendscore: {
			require:		['token','score','time','level','sent'],
			auth:			'authtoken',
			description:	"Send the score for a level",
			params:			{token:"Game token, returned by game.start",score:"int",time:"milliseconds - Time taken by the level.",level:"int",sent:"Time sent",data:"Level data"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params.data	= scope.Gamify.api.fixTypes(params.data, {
					score:	'number',
					time:	'number',
					level:	'number',
					sent:	'date'
				});
				
				scope.mongo.update({
					collection:	scope.collections.scores,
					query:		{
						token:	params.token,
						uid:	params.__auth
					},
					data:		{
						$addToSet:	{
							scores:	{
								submitted:	new Date(),
								level:		params.level,
								score:		params.score,
								time:		params.time,
								sent:		params.sent,
								data:		params.data
							}
						},
						$inc:	{
							"result.score":	params.score,
							"result.time":	params.time
						}
					}
				}, function(query_output) {
					scope.mongo.find({
						collection:	scope.collections.scores,
						query:		{
							token:	params.token,
							uid:	params.__auth
						},
						fields:	{
							result:	true
						}
					}, function(response) {
						callback(response[0].result);
					});
				});
			}
		},
		
		
		
		
		/*
		*	game.end close the game session, and compute the final score.
		*/
		end: {
			require:		['token'],
			auth:			'authtoken',
			description:	"End a game, validate the score.",
			params:			{token:"Game token, returned by game.start"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the user's data (we'll need it for the challenge)
				scope.Gamify.api.execute("user","find", {query:{uid: params.__auth}}, function(user_response) {
					
					var user = user_response[0];
					//console.log("\033[35m user:\033[37m",user);
					
					// First we get the score data
					scope.mongo.find({
						collection:	scope.collections.scores,
						query:		{
							token:	params.token,
							uid:	params.__auth
						},
						fields:	{
							result:	true,
							maxtime:	true,
							race:		true,
							live:		true
						}
					}, function(response) {
						if (response.length == 0) {
							callback(Gamify.api.errorResponse("The game token provided is invalid."));
							return false;
						}
						//console.log("\033[35m response:\033[37m",response);
						var results = response[0].result;
						var maxtime = response[0].maxtime;
						
						// Now we calculate the time multiplier
						if (response[0].late && !response[0].imported) {
							// User was late. We need to deduce that time from their score...
							var multiplier	= (1 - (Math.max((results.time+response[0].snapshot), maxtime)/maxtime)) + 1;	// max() is there to not have negative multipliers
						} else {
							var multiplier	= (1 - (results.time/maxtime)) + 1;
						}
						
						// Update the data (we're gonna reuse them instead of re-doing another query to get the db's copy)
						results.total		= results.score*multiplier;
						results.multiplier	= multiplier;
						
						scope.mongo.update({
							collection:	scope.collections.scores,
							query:		{
								token:	params.token,
								uid:	params.__auth,
								live:	response[0].live
							},
							data:		{
								$set:	{
									"result.total":			results.total,
									"result.multiplier":	results.multiplier,
									ended:					new Date()
								}
							}
						}, function(query_output) {
							// Let's get our position!
							scope.mongo.count({
								collection:		scope.collections.scores,
								query:			{
									race:		response[0].race,
									live:		response[0].live,
									"results.total":	{
										$gt:	results.total
									}
								}
							}, function(count) {
								// Now we process the challenges: Win or lost
								
								// Send the position
								callback({
									result:		results,
									position:	count+1,
									live:		response[0].live
								});
								
								// Save the score
								scope.mongo.update({
									collection:		scope.collections.challenges,
									query:			{
										$or:	[{
											uid:	user.uid
										},{
											fbuid:	user.fbuid
										}],
										race:			response[0].race,
										live:			response[0].live,
										winner:		{
											$exists:	false
										}
									},
									data: {
										$addToSet: {
											results:	_.extend({uid:user.uid},results)
										}
									},
									options:	{
										multi: true
									}
								}, function(update_done) {
									
									// Check if there are challenges to clear
									scope.mongo.find({
										collection:		scope.collections.challenges,
										query:			{
											$or:	[{
												uid:	user.uid
											},{
												fbuid:	user.fbuid
											}],
											race:			response[0].race,
											live:			response[0].live,
											winner:		{
												$exists:	false
											}
										},
									}, function(challenges) {
										console.log("\033[35m challenges:\033[37m",challenges);
										
										var i;
										var l = challenges.length;
										for (i=0;i<l;i++) {
											(function(challenge) {
												// Only process if there are more than 2 results
												if (challenge.results && challenge.results.length >= 2) {
													// Check if there are more than one player
													var players = [];
													var best		= 0;
													var bestPlayer	= "";
													var j;
													var l2 = challenge.results.length;
													for (j=0;j<l2;j++) {
														players.push(challenge.results[j].uid);
														if (challenge.results[j].total > best) {
															best 		= challenge.results[j].total;
															bestPlayer	= challenge.results[j].uid;
														}
													}
													players = _.uniq(players);
													if (players.length == 2) {
														
														console.log("\033[35m challenge:\033[37m",challenge.uuid);
														console.log("\033[35m players:\033[37m",players);
														console.log("\033[35m bestPlayer:\033[37m",bestPlayer);
														console.log("\033[35m bestScore:\033[37m",best);
														
														// Set the winner!
														scope.mongo.update({
															collection:		scope.collections.challenges,
															query:			{
																uuid:	challenge.uuid
															},
															data: {
																$set: {
																	winner:		bestPlayer,
																	bestScore:	best
																}
															}
														}, function(update_done) {
															
														});
														
														// In the background, give the achievement
														Gamify.api.execute("achievement","unlock", {
															authtoken:		Gamify.settings.systoken,
															user:	{
																uid:		bestPlayer
															},
															alias:	"challenge_win"
														}, function(unlocked_done) {
															console.log("\033[35m [>challenge_win]:\033[37m",unlocked_done);
														});
													}
												}
											})(challenges[i]);
										}
									});
									
								});
								
								
							});
						});
						
					});
				});
			}
		},
		
		
		
		
		/*
		*	game.end close the game session, and compute the final score.
		*/
		getPosition: {
			require:		['token'],
			auth:			'authtoken',
			description:	"Get the current position for a game token",
			params:			{token:"Game token, returned by game.start"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// First we get the score data
				scope.mongo.find({
					collection:	scope.collections.scores,
					query:		{
						token:	params.token,
						uid:	params.__auth
					},
					fields:	{
						result:		true,
						maxtime:	true,
						race:		true,
						live:		true
					}
				}, function(response) {
					if (response && response.length > 0) {
						response = response[0];
						
						// Let's get our position!
						scope.mongo.count({
							collection:		scope.collections.scores,
							query:			{
								race:		response.race,
								live:		response.live,
								"result.total":	{
									$gt:	response.result.total
								}
							}
						}, function(count) {
							callback({
								result:		response.result,
								position:	count+1
							})
						});
					} else {
						callback(Gamify.api.errorResponse("This race doesn't exist"));
					}
					
				});
			}
		},
		
		
		
		
		ranking: {
			require:		['race'],
			auth:			false,
			description:	"Returns the ranking for a game, paginated. Only game sessions ended using game.end will appear.",
			params:			{race:"Race alias",live:"Bool - live race - Default: <code>false</code>"},
			status:			'stable',
			version:		1.4,
			callback:		function(params, req, res, callback) {
				
				
				scope.mongo.paginate(_.extend(params,{
					collection:	scope.collections.scores,
					query:		{
						race:	params.race,
						live:	params.live?true:false,
						'result.total': {
							$gt: 0
						},
						ended:	{
							$ne:	false
						}
					},
					sort:		{
						"result.total":	-1
					}
				}), function(response) {
					var nextParam		= _.extend({},params);
					nextParam.page 		= response.pagination.current+1;
					var prevParam		= _.extend({},params);
					prevParam.page		= response.pagination.current-1;
					
					// Get the uids
					var uids = [];
					var i;
					var l = response.data.length;
					for (i=0;i<l;i++) {
						uids.push(response.data[i].uid);
					}
					scope.Gamify.api.execute("user","find", {
						query:	 {
							uid:	 {
								$in: 	uids
							}
						}
					}, function(users) {
						users = Gamify.utils.indexed(users, "uid");
						
						for (i=0;i<l;i++) {
							response.data[i].user = users[response.data[i].uid];
						}
						
						
						response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
						response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
						callback(response);
						
					});
					
				});
			}
		},
		
		
		
		
		challenge: {
			require:		['race','fbreq','live'],
			auth:			'authtoken',
			description:	"Challenge facebook friends to a race.",
			params:			{race:"alias of the race",fbreq:"fb friend request object",live:"Bool - live race or arcade mode."},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack	= new Gamify.stack();
				
				
				var i;
				var l 		= params.fbreq.to.length;
				var queries = [];
				
				for (i=0;i<l;i++) {
					stack.add(function(param, onProcessed) {
						// Make sure there are no existing request
						scope.mongo.count({
							collection:		scope.collections.challenges,
							query:			{
								fbuid:		params.fbreq.to[param.i]*1,
								race:		params.race,
								live:		params.live,
								uid:		params.__auth,
								accepted:	false,
								refused:	false
							}
						}, function(count) {
							if (count == 0) {
								queries.push({
									uuid:		scope.Gamify.crypto.md5(scope.Gamify.uuid.v4()),
									fbrequest:	params.fbreq.request*1,
									fbuid:		params.fbreq.to[param.i]*1,
									date:		new Date(),
									race:		params.race,
									live:		params.live,
									uid:		params.__auth,
									accepted:	false,
									refused:	false
								});
							}
							onProcessed();
						});
					},{i:i});
				}
				
				stack.process(function() {
					// Save the challenges
					scope.mongo.insert({
						collection:		scope.collections.challenges,
						data: 			queries
					}, function(response) {
						callback({challenged:queries.length});
					});
					
					// Save the invites
					scope.Gamify.api.execute("log","fbinvite", {
						fbreq:		params.fbreq,
						authtoken:	params.authtoken
					}, function(response) {
						
					});
					
					
				}, true);	// async
				
				
				
			}
		},
		
		
		
		
		
		acceptChallenge: {
			require:		['challenge'],
			auth:			'authtoken',
			description:	"Accept a challenge",
			params:			{challenge:"Challenge's UUID"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the challenge
				scope.mongo.find({
					collection:		scope.collections.challenges,
					query:			{
						uuid:	params.challenge
					}
				}, function(response) {
					if (response && response.length > 0) {
						// Update the challenge's data
						scope.mongo.update({
							collection:		scope.collections.challenges,
							query:			{
								uuid:	params.challenge
							},
							data:			{
								$set:	{
									accepted:	true
								}
							}
						}, function(done) {
							callback({accepted: true, live:	response[0].live, race:	response[0].race});
							
							
							// In the background, give the achievement
							Gamify.api.execute("achievement","unlock", {
								authtoken:		Gamify.settings.systoken,
								user:	{
									uid:		response[0].uid
								},
								alias:	"challenge_accepted"
							}, function(unlocked_done) {
								console.log("\033[35m [>live_register]:\033[37m",unlocked_done);
							});
						});
					} else {
						callback(Gamify.api.errorResponse("This challenge doesn't exist."));
					}
				});
				
			}
		},
		
		
		
		
		
		declineChallenge: {
			require:		['challenge'],
			auth:			'authtoken',
			description:	"Decline a challenge.",
			params:			{challenge:"Challenge's UUID"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Get the challenge
				scope.mongo.find({
					collection:		scope.collections.challenges,
					query:			{
						uuid:	params.challenge
					}
				}, function(response) {
					if (response && response.length > 0) {
						// Update the challenge's data
						scope.mongo.update({
							collection:		scope.collections.challenges,
							query:			{
								uuid:	params.challenge
							},
							data:			{
								$set:	{
									refused:	true
								}
							}
						}, function(done) {
							callback({refused: true, live:	response[0].live, race:	response[0].race});
						});
					} else {
						callback(Gamify.api.errorResponse("This challenge doesn't exist."));
					}
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
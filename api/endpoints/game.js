var _ 					= require('underscore');
var qs 					= require("querystring");

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify 		= Gamify;
	this.collections	= {
		scores:		"scores",
		user:		"users"
	};
	
	// Return the methods
	var methods = {
		
		
		/*
		*	game.start init a new game, prepare the data and returns a game token, that is required to send scores for that game.
		*/
		start: {
			require:		['game','duration'],
			auth:			'authtoken',
			description:	"Start a new game. Returns a game token, required to send scores, end the game, and other game-specific functions.",
			params:			{game:"string - Game ID",duration:"milliseconds"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var token 	= scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
				
				params.data	= scope.Gamify.api.fixTypes(params.data, {
					duration:	'number'
				});
				
				// Get the user data first
				scope.Gamify.api.execute("user","find", {query:{uid: params.__auth}}, function(user_response) {
					
					var user = user_response[0];
					
					scope.mongo.insert({
						collection:	scope.collections.scores,
						data:		{
							uid:		params.__auth,
							game:		params.game,
							maxtime:	params.duration,
							started:	new Date(),
							ended:		false,
							token:	token,		// Game token, used to submit scores
							scores:	[],
							result:	{
								score:		0,
								time:		0,
								multiplier:	0,
								total:		0
							},
							user:	user
						}
					}, function(response) {
						callback({
							token:	token
						});
					});
				});
			}
		},
		
		
		/*
		*	game.sendscore is used to receive the score and time per level. It requires a game token.
		*/
		sendscore: {
			require:		['token','score','time','level'],
			auth:			'authtoken',
			description:	"Send the score for a level",
			params:			{token:"Game token, returned by game.start",score:"int",time:"milliseconds - Time taken by the level.",level:"int"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params.data	= scope.Gamify.api.fixTypes(params.data, {
					score:	'number',
					time:	'number',
					level:	'number'
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
								time:		params.time
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
				
				// First we get the score data
				scope.mongo.find({
					collection:	scope.collections.scores,
					query:		{
						token:	params.token,
						uid:	params.__auth
					},
					fields:	{
						result:		true,
						maxtime:	true
					}
				}, function(response) {
					var results = response[0].result;
					var maxtime = response[0].maxtime;
					
					// Now we calculate the time multiplier
					var multiplier	= (1 - (results.time/maxtime)) + 1;
					
					// Update the data (we're gonna reuse them instead of re-doing another query to get the db's copy)
					results.total		= results.score*multiplier;
					results.multiplier	= multiplier;
					
					scope.mongo.update({
						collection:	scope.collections.scores,
						query:		{
							token:	params.token,
							uid:	params.__auth
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
								"result.total":	{
									$gt:	results.total
								}
							}
						}, function(count) {
							callback({
								result:		results,
								position:	count+1
							})
						});
					});
				});
			}
		},
		
		
		
		
		ranking: {
			require:		['game'],
			auth:			false,
			description:	"Returns the ranking for a game, paginated. Only game sessions ended using game.end will appear.",
			params:			{game:"string - Game ID"},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				
				scope.mongo.paginate(_.extend(params,{
					collection:	scope.collections.scores,
					query:		{
						game:	params.game,
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
					
					response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
					response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
					callback(response);
				});
			}
		},
		
		
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;
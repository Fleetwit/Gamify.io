var _ 					= require('underscore');
var qs 					= require("querystring");
var request 			= require('request');

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		encode: {
			require:		['location'],
			auth:			false,
			callback:		function(params, req, res, callback) {
				
				request.get('http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address='+escape(params.location), function (error, response, body) {
					
					if (!error && response.statusCode == 200) {
						var data 	= JSON.parse(body);
						
						data 		= data.results[0];
						
						var keys = {
							postal_code:					"zipcode",
							locality:						"city",
							administrative_area_level_1:	"state",
							country:						"country"
						};
						var i;
						var j;
						var output = {
							levels:		{},
							address:	data.formatted_address,
							gps:		{
								lat: 	data.geometry.location.lat,
								lng: 	data.geometry.location.lng
							},
							geojson:	{
								type:			"point",
								coordinates:	[data.geometry.location.lng, data.geometry.location.lat]
							}
						};
						for (i in data.address_components) {
							for (j in data.address_components[i].types) {
								if (keys[data.address_components[i].types[j]]) {
									output.levels[keys[data.address_components[i].types[j]]] = data.address_components[i].short_name;
								}
							}
						}
						
						// Get the timezone now
						// "https://maps.googleapis.com/maps/api/timezone/json?location=".$output["lat"].",".$output["lng"]."&timestamp=".time()."&sensor=false"
						request.get('https://maps.googleapis.com/maps/api/timezone/json?location='+data.geometry.location.lat+","+data.geometry.location.lng+"&timestamp="+Math.round(new Date().getTime()/1000)+"&sensor=false", function (error, response, body) {
							
							if (!error && response.statusCode == 200) {
								var data 	= JSON.parse(body);
								
								output.timezone	= data.timeZoneId;
								
								callback(output);
							}
						});
						
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
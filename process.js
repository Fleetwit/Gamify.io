/**
* Module dependencies.
*/
var _ 			= require('underscore');
var Twig 		= require("twig");
var express 	= require('express');
var http 		= require('http');
var path 		= require('path');
var Gamify 		= require("Gamify.io");

var options = _.extend({
	env:		"dev",
	debug_mode:	false,
	port:		8080
},processArgs());

var app = express();

// all environments
app.set('port', process.env.PORT || options.port);
app.set('env', options.env);
app.set('views', __dirname + '/api/doc/templates');
app.set('view engine', 'twig');
app.set('view cache', false);
app.disable('view cache');
app.set("twig options", {
	strict_variables: false
});
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('dev' == app.get('env')) {
	app.use(express.errorHandler());
}


Gamify.settings.db 					= "dev";
Gamify.settings.systoken 			= "sys540f40c9968814199ec7ca847ec45";
Gamify.settings.max_min_late		= 10;		// min
Gamify.settings.default_race_time	= 1000;		// ms

Gamify.api.init(function() {
	console.log("API mapped. Starting server...");
	
	// Start the server
	http.createServer(app).listen(app.get('port'), function(){
		console.log('API server listening on port ' + app.get('port'));
	});
});

var apiRoute = function(req, res) {
	var data = {};
	if (req.route.method=='post') {
		data = _.extend({}, req.body);
	} else {
		data = _.extend({}, req.query);
		try {
			data.params = _.extend({},JSON.parse(data.params));	// get means we need to parse
		} catch(e) {}
	}
	console.log("\033[35m data(params):\033[37m",data);
	// Fix the types
	var i;
	for (i in data) {
		if (!isNaN(data[i]*1)) {
			data[i] *= 1;
		}
		if (data[i] == "true") {
			data[i] = true;
		}
		if (data[i] == "false") {
			data[i] = false;
		}
	}
	Gamify.api.execute(req.params.endpoint, req.params.method, data, function() {}, req.params.format, req, res);
}

app.get("/:endpoint/:method/:format?", function(req, res){
	apiRoute(req, res);
});
app.post("/:endpoint/:method/:format?", function(req, res){
	apiRoute(req, res);
});
app.get("/", function(req, res){
	res.set("Content-Type", "application/json");
	res.send(200, JSON.stringify({
		name:		"Gamify API Server",
		version:	Gamify.version,
		db:			Gamify.settings.db,
		options:	options,
		endpoints:	Gamify.api.endpoints
	}, null, 4));
});




function processArgs() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
			if (args[i+1] == "true") {
				args[i+1] = true;
			}
			if (args[i+1] == "false") {
				args[i+1] = false;
			}
			if (!isNaN(args[i+1]*1)) {
				args[i+1] = args[i+1]*1;
			}
			output[args[i].substr(1)] = args[i+1];
			i++;
		}
	}
	return output;
};

/************************************/
/************************************/
/************************************/
// Process Monitoring
setInterval(function() {
	process.send({
		memory:		process.memoryUsage(),
		process:	process.pid
	});
}, 1000);

// Crash Management
if (!options.debug_mode) {
	process.on('uncaughtException', function(err) {
		console.log("err",methods);
		//global.monitor.log("Stats.error", err.stack);
	});
}
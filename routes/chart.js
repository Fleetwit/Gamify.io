var _ 					= require('underscore');
var fleetwit 			= require("fleetwit");
var userClass 			= fleetwit.users;
var raceClass 			= fleetwit.races;
/*
 * API
 */

String.prototype.replaceAll = function(find, replace) {
	return this.replace(new RegExp(find, 'g'), replace);
}
Date.prototype.time = function() {
	return this.getDate()+"/"+(this.getMonth()+1)+"-"+this.getHours()+":"+this.getMinutes()+":"+this.getSeconds();
}
Date.prototype.toDate = function() {
	return this.getDate()+"/"+(this.getMonth()+1);
}
Date.prototype.RoundToSecond = function() {
	return new Date(this.getFullYear(),this.getMonth(),this.getDate(),this.getHours(),this.getMinutes(),this.getSeconds()).getTime();
}
Date.prototype.RoundToMinute = function() {
	return new Date(this.getFullYear(),this.getMonth(),this.getDate(),this.getHours(),this.getMinutes()).getTime();
}
Date.prototype.RoundToHour = function() {
	return new Date(this.getFullYear(),this.getMonth(),this.getDate(),this.getHours(),0).getTime();
}
Date.prototype.RoundToDay = function() {
	return new Date(this.getFullYear(),this.getMonth(),this.getDate(),0,0).getTime();
}


function charts() {
	this.charts 	= {};
	this.directory	= "views/charts/";
	this.chartData	= new chartData();
	this.stack		= new global.stack();
}
charts.prototype.get = function(data, callback) {
	var scope 	= this;
	var charts	= data;
	var name;
	var chartList = {};
	for (name in charts) {
		this.stack.add(function(params, onFinish) {
			scope.addChart(params.name, charts[params.name], function() {
				chartList[params.name] = scope.charts[params.name];
				onFinish();
			});
		}, {name:name});
	}
	this.stack.process(function() {
		callback(chartList);
	});
}

charts.prototype.addChart = function(name, chart, callback) {
	var scope = this;
	
	if (this.chartData[chart.type]) {
		// Get data
		this.chartData[chart.type](chart, function(data) {
			// Get HTML
			global.file.read(scope.directory+chart.type+".html", function(html) {
				// Get JS
				global.file.read(scope.directory+chart.type+".js", function(js) {
					scope.charts[name] = {
						html:	html.replaceAll("%name%", name).replaceAll("%type%", chart.type),
						js:		js.replaceAll("%name%", name).replaceAll("%type%", chart.type).replaceAll("%data%", JSON.stringify(data)),
						data:	data,
						obj:	chart
					};
					callback();
				});
			});
		});
	} else {
		callback();
	}
}



function chartData() {
	this.charts 	= {};
	this.directory	= "views/charts/";
	this.stack		= new global.stack();
}

// Limit the range of the data
chartData.prototype.limit = function(data, limit) {
	var keys	= [];
	var i;
	var k;
	
	// Get all the keys
	for (i=0;i<data.length;i++) {
		keys = _.union(keys, _.map(data[i].data, function(item, key) { return item[0]; }));
	}
	
	// Sort the keys Desc
	keys = keys.sort(function(a, b) {
		return a < b;
	});
	// Only get the last ones
	keys = keys.slice(0,limit);
	var min = _.min(keys);
	var max = _.max(keys);
	
	// Remove the extra data
	for (i=0;i<data.length;i++) {
		var before = data[i].data.length;
		data[i].data = _.filter(data[i].data, function(item) {
			if (_.contains(keys, item[0])) {
				return true;
			}
		});
		var after = data[i].data.length;
	}
	
	return data;
}
// Limit the range of the data and return the data with the limits
chartData.prototype.getDataRange = function(data, limit) {
	var keys	= [];
	var i;
	var k;
	
	// Get all the keys
	for (i=0;i<data.length;i++) {
		keys = _.union(keys, _.map(data[i].data, function(item, key) { return item[0]; }));
	}
	
	// Sort the keys Desc
	keys = keys.sort(function(a, b) {
		return a < b;
	});
	// Only get the last ones
	keys = keys.slice(0,limit);
	var min = _.min(keys);
	var max = _.max(keys);
	
	// Remove the extra data
	for (i=0;i<data.length;i++) {
		var before = data[i].data.length;
		data[i].data = _.filter(data[i].data, function(item) {
			if (_.contains(keys, item[0])) {
				return true;
			}
		});
		var after = data[i].data.length;
	}
	
	return {
		data:		data,
		min:		min,
		max:		max
	};
}
// Limit the range of the data
chartData.prototype.getDataForRange = function(data, range, period, incremental) {
	var keys	= [];
	var i;
	var k;
	
	if (!incremental) {
		incremental = false;
	}
	var step;
	var dateMethod;
	
	switch (period) {
		default:
		case "seconds":
			step		= 1000;
			dateMethod	= "RoundToSecond";
		break;
		case "minutes":
			step		= 60*1000;
			dateMethod	= "RoundToMinute";
		break;
		case "hours":
			step		= 60*60*1000;
			dateMethod	= "RoundToHour";
		break;
		case "days":
			step		= 60*60*24*1000;
			dateMethod	= "RoundToDay";
		break;
	}
	var steps = (range[1]-range[0])/step;
	
	// Remove the extra data
	for (i=0;i<data.length;i++) {
		data[i].data = _.filter(data[i].data, function(item) {
			//console.log("Item: ["+new Date(item[0]).time()+"] > ["+new Date(range[0]).time()+"] < ["+new Date(range[1]).time()+"]");
			if (item[0] >= range[0] && item[0] <= range[1]) {
				return true;
			}
		});
	}
	// transform into an object to avoid a log(n) loop on the next step
	var buffer = [];
	for (i=0;i<data.length;i++) {
		var temp = {};
		for (k=0;k<data[i].data.length;k++) {
			var time = new Date(data[i].data[k][0])[dateMethod]();
			if (!temp[time]) {
				temp[time] = 0;
			}
			temp[time] += data[i].data[k][1];
			
		}
		buffer.push(temp);
	}
	
	for (i=0;i<data.length;i++) {
		// Remove the original data
		data[i].data = [];
		// Recreate the data
		var total = 0;
		for (k=0;k<steps;k++) {
			var time = (k*step)+range[0];
			if (buffer[i][time]) {
				if (incremental) {
					total += buffer[i][time];
					data[i].data.push([time,total]);
				} else {
					data[i].data.push([time,buffer[i][time]]);
				}
			} else {
				if (incremental) {
					data[i].data.push([time,total]);
				} else {
					data[i].data.push([time,0]);
				}
			}
		}
	}
	
	
	return data;
	
}
chartData.prototype.test = function(options, callback) {
	options = _.extend({},options);
	var data = [];
	var d1 = [];
	for (var i = 0; i <= 30; i += 1) {
		d1.push([i, parseInt(Math.random() * 30)]);
	}
	data.push(d1);
	var d2 = [];
	for (var i = 0; i <= 30; i += 1) {
		d2.push([i, parseInt(Math.random() * 30)]);
	}
	data.push(d2);
	var d3 = [];
	for (var i = 0; i <= 30; i += 1) {
		d3.push([i, parseInt(Math.random() * 30)]);
	}
	data.push(d3);
	callback(data);
}

chartData.prototype.process = function(options, callback) {
	var scope = this;
	options = _.extend({
		service:	"Mailstack",
		period:		"seconds"
	},options);
	
	var range = [];
	switch (options.period) {
		default:
		case "seconds":
			range = [new Date().RoundToSecond()-(60*1000),new Date().RoundToSecond()];
		break;
		case "minutes":
			range = [new Date().RoundToMinute()-(60*60*1000),new Date().RoundToMinute()];
		break;
		case "hours":
			range = [new Date().RoundToHour()-(60*60*60*1000),new Date().RoundToHour()];
		break;
	}
	
	global.mongoStats.open("monitoring", function(collection) {
		collection.find({
			name:	options.service,
			period:	options.period
		}).sort({time:-1}).limit(60).toArray(function(err, docs) {
			var i;
			var k;
			var l = docs.length;
			var data 		= [];
			var processData	= {};
			for (i=0;i<l;i++) {
				for (k in docs[i].data) {
					if (!processData[k]) {
						processData[k] = []
					}
					processData[k].push([docs[i].time,Math.round(docs[i].data[k].sum/docs[i].data[k].n)]);
				}
			}
			// assemble the data
			for (k in processData) {
				data.push({
					label:	k,
					data: 	processData[k]
				});
			}
			// return
			callback(scope.getDataForRange(data, range, options.period));
		});
	});
			
}

chartData.prototype.pushdata = function(options, callback) {
	var scope = this;
	options = _.extend({
		name:		"Mailstack.stack",
		period:		"seconds"
	},options);
	
	var range = [];
	switch (options.period) {
		default:
		case "seconds":
			range = [new Date().RoundToSecond()-(60*1000),new Date().RoundToSecond()];
		break;
		case "minutes":
			range = [new Date().RoundToMinute()-(60*60*1000),new Date().RoundToMinute()];
		break;
		case "hours":
			range = [new Date().RoundToHour()-(60*60*60*1000),new Date().RoundToHour()];
		break;
	}
	
	global.mongoStats.open("monitoring", function(collection) {
		collection.find({
			type:	"push",
			name:	options.name,
			period:	options.period
		}).sort({time:-1}).limit(60).toArray(function(err, docs) {
			var i;
			var k;
			var l = docs.length;
			
			var data 		= [];
			for (i=0;i<l;i++) {
				data.push([docs[i].time, docs[i].sum]);
			}
			var output = [];
			output.push({
				label:	options.name,
				data: 	data,
				bars: 	{
					show:	true
				}
			});
			
			// return
			callback(scope.getDataForRange(output, range, options.period, false));
		});
	});
			
}

chartData.prototype.users = function(options, callback) {
	global.mysql.query("select firstname,uid,email,avatar_small from users order by id desc limit 0,10", function(err, rows, fields) {
		
		if (rows.length > 0) {
			var i;
			for (i=0;i<rows.length;i++) {
				rows[i].avatar_small = global.fleetwit+rows[i].avatar_small;
			}
			callback(rows);
		} else {
			callback([]);
		}
	});
}

chartData.prototype.logs = function(options, callback) {
	var scope = this;
	options = _.extend({
		name:		"Mailstack.error"
	},options);
	
	global.mongoStats.open("monitoring", function(collection) {
		collection.find({
			type:	"log",
			name:	options.name
		}).sort({time:-1}).limit(10).toArray(function(err, docs) {
			// return
			callback(docs);
		});
	});
			
}

chartData.prototype.growth = function(options, callback) {
	var scope = this;
	
	// get the growth data
	var users = new userClass();
	
	range = [new Date().RoundToDay()-(60*60*24*60*1000),new Date().RoundToDay()+60*60*24*1000];
	
	users.getGrowth(function(points) {
		var data = [];
		data.push({
			label:	"Growth",
			data: 	points
		});
		var i;
		for (i=0;i<points.length;i++) {
			console.log("point #"+i+":\t",new Date(points[i][0]).time());
		}
		
		// return
		callback(scope.getDataForRange(data, range, "days", true));
	});
	
}
chartData.prototype.raceGrowth = function(options, callback) {
	var scope = this;
	
	// get the growth data
	var race = new raceClass();
	
	range = [new Date().RoundToDay()-(60*60*24*60*1000),new Date().RoundToDay()+60*60*24*1000];
	
	console.log("options",options);
	
	race.getGrowth(options.uuid, function(points) {
		var data = [];
		data.push({
			label:	"Growth",
			data: 	points
		});
		
		// return
		callback(scope.getDataForRange(data, range, "days", true));
	});
	
}

var chart = {
	manager:	new charts()
};


exports.index = function(req, res){
	
	var data = {};
	if (req.route.method=='post') {
		data = _.extend({}, req.body);
	} else {
		data = _.extend({}, req.query);
	}
	data = _.extend({
		raw:	false,
		charts:	{}
	}, data);
	
	chart.manager.get(data.charts, function(response) {
		if (data.raw && data.raw != 'false') {
			var buffer = {};
			var k;
			for (k in response) {
				buffer[k] = response[k].data;
			}
			res.json(buffer);
		} else {
			res.json(response);
		}
	});
};
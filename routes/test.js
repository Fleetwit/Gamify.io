var _ 					= require('underscore');
/*
 * API
 */

exports.index = function(req, res){
	
	var data = {};
	if (req.route.method=='post') {
		data = _.extend({}, req.body);
	} else {
		data = _.extend({}, req.query);
		try {
			data.params = _.extend({},JSON.parse(data.params));	// get means we need to parse
		} catch(e) {}
	}
	
	switch (data.type) {
		case "pushdata":
			var i;
			var l 		= 50;
			var past	= (60*60)*1000;
			var inc		= Math.round(past/l);
			for (i=0;i<l;i++) {
				pushData("Mailstack.stack", Math.round(Math.random()*50), past-(inc*i))
			}
			res.json({
				test:		true,
				increment:	inc,
				points:		l
			});
		break;
		case "logout":
			res.cookie('authtoken', false);
			res.json({
				logout: true
			});
		break;
		default:
			res.json({
				error: true,
				message:	"method not found"
			});
		break;
	}
	
	
};


function pushData(name, value, delay){
	var d			= new Date(new Date().getTime()-delay);
	var periods = {
		"seconds":	new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds()).getTime(),
		"minutes":	new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes()).getTime(),
		"hours":	new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()).getTime(),
		"days":		new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()
	};
	console.log("pushData: ",d);
	var k;
	var updateObj = {
		'$inc':	 {}
	};
	updateObj['$inc']['sum'] 	= value;
	updateObj['$inc']['count'] 	= 1;
	
	var p;
	for (p in periods) {
		global.mongoStats.update("monitoring", {
			period:	p,
			time:	periods[p],
			type:	"push",
			name:	name,
		},updateObj,
		function(err, docs) {
			// done
		});
	}
};
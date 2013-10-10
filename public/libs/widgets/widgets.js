
String.prototype.replaceAll = function(find, replace) {
	return this.replace(new RegExp(find, 'g'), replace);
}
Date.prototype.pretty = function() {
	return this.getDate()+"/"+(this.getMonth()+1)+" at "+this.getHours()+":"+this.getMinutes()+":"+this.getSeconds();
}

function widgetsLoader(options) {
	var scope = this;
	
	this.options = $.extend({
		container:	"#photon_widgets"
	},options);
	
	// Store the widgets to load
	this.widgets 	= {};	
	
	this.chart 		= new chartLoader(this);
	
	this.bindEvents();
	if (_.keys(this.widgets).length > 0) {
		this.load(this.widgets, function(chartName, chartData) {
			scope.display(chartName, chartData);
		});
	}
	
}
widgetsLoader.prototype.serialize = function() {
	var scope = this;
	// Serialize
	var i;
	var widgetOrder = [];
	var widgets = $(this.options.container).children();
	for (i=0;i<widgets.length;i++) {
		if ($(widgets[i]).data("name")) {
			widgetOrder.push($(widgets[i]).data("name"));
		}
	}
	$.apicall({
		method:	"widget.order",
		params:	{
			order: 		widgetOrder,
			dashboard:	this.options.dashboard
		}
	});
};
widgetsLoader.prototype.load = function(charts, callback, options) {
	var scope = this;
	
	options = $.extend({raw:false},options);
	
	$.ajax({
		url: 		"/chart",		// static url for the API calls
		dataType:	"json",
		type:		"POST",
		data:		{
			raw:	options.raw,
			charts:	charts
		},
		success: 	function(data){
			var name;
			var i;
			// order by "order"
			var order = [];
			for (name in data) {
				order.push({
					name:	name,
					data:	data[name]
				});
			}
			// order the array
			order.sort(function(a, b) {
				if (a.data.obj && b.data.obj && a.data.obj.order && b.data.obj.order && a.data.obj.order > b.data.obj.order) {
					return 1;
				}
				return -1;
			});
			for (i=0;i<order.length;i++) {
				callback(order[i].name, order[i].data);
			}
		},
		error: function(jqXHR, data, errorThrown) {
			console.log("ERROR: ",data);
		}
	});
};
widgetsLoader.prototype.display = function(name, data) {
	// Load the JS and HTML
	$(this.options.container).append(data.html);
	eval(data.js);
};
widgetsLoader.prototype.bindEvents = function() {
	var scope = this;
	
	// Handle settings
	$("body").on("click",".widget_settings_button", function() {
		var root 		= $(this).parents(".root");
		var widgetName	= root.attr("data-name");
		root.formapi({
			success: function(data) {
				console.log("data: ",data);
				scope.widgets[widgetName] 		= $.extend(scope.widgets[widgetName], data, {forceReload: true});
				console.log("Settings: ",scope.widgets[widgetName]);
				scope.chart.reloadData();	// reload now
				
				// Save the changes to the widget
				$.apicall({
					method:	"widget.update",
					params:	{
						widget: 	widgetName,
						dashboard:	scope.options.dashboard,
						value:		scope.widgets[widgetName]
					}
				});
			}
		});
	});
	$("body").on("click",".widget_settings_remove", function() {
		var root 		= $(this).parents(".root");
		var widgetName	= root.attr("data-name");
		var c = confirm("Are you sure you want to remove this widget from your dashboard?");
		if (c) {
			$.apicall({
				method:	"widget.remove",
				params:	{
					widget: 	widgetName,
					dashboard:	scope.options.dashboard
				}
			});
			root.remove();
		}
	});
};

function chartLoader(widgetRef) {
	this.frequency	= 30000;
	this.widgetRef	= widgetRef;
	this.onData		= {};
	this.paused		= false;
	this.setInterval(this.frequency);
}
chartLoader.prototype.setInterval = function(frequency) {
	var scope = this;
	this.frequency	= frequency;
	
	window.clearInterval(this.interval);
	this.interval	= window.setInterval(function() {
		if (!scope.paused) {
			scope.reloadData();
		}
	}, this.frequency);
}
chartLoader.prototype.reloadData = function() {
	var scope = this;
	
	var name;
	// Group the calls
	var widgetsToLoad = {};
	for (name in scope.widgetRef.widgets) {
		if (scope.widgetRef.widgets[name].chartType == "realtime" || scope.widgetRef.widgets[name].forceReload == true) {
			widgetsToLoad[name] = scope.widgetRef.widgets[name];
			if (scope.widgetRef.widgets[name].forceReload == true) {
				delete scope.widgetRef.widgets[name].forceReload;	// stop forcing the reload if it's not a realtime chart
			}
		}
	}
	
	// Call the data
	if (_.keys(widgetsToLoad).length > 0) {
		scope.widgetRef.load(widgetsToLoad, function(chartName, chartData) {
			// Reload the data
			if (scope.onData[chartName]) {
				scope.onData[chartName](chartData);
			}
			
		}, {raw:true});
	}
	
	
}
chartLoader.prototype.realtime = function(name, type, data, options) {
	var scope 		= this;
	var k;
	var container	= "#chart_"+name;
	
	// Add to the settings
	scope.widgetRef.widgets[name] = $.extend({
		chartType: 	"realtime",
		type:		type,
		description:"",
		service:	"Mailstack",
		period:		"seconds"
	},scope.widgetRef.widgets[name],options);
	
	this.onData[name]	= function(data) {
		var plotOptions	= {
			xaxis: {
				mode: 		"time",
				tickSize: 	[1, "second"],
				axisLabel: "Time",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 10,
				tickFormatter: function (v, axis) {
					var date = new Date(v);
				
					if (date.getSeconds() % 20 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
				
						return hours + ":" + minutes + ":" + seconds;
					} else {
						return "";
					}
				}
			},
			yaxis: {
				min: 900,
				tickFormatter: function (v, axis) {
					return v + "ms";
				},
				axisLabel: "Exec time",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 6
			},
			legend: {
				show: 		false,     
				labelBoxBorderColor: "#fff"
			},
			series: {
				lines: {
					show: 		true,
					lineWidth: 	1.2,
					fill: 		true
				}
			}
		};
		
		switch (scope.widgetRef.widgets[name].period) {
			case "minutes":
				plotOptions.xaxis.tickSize 		= [1, "minute"];
				plotOptions.xaxis.tickFormatter = function (v, axis) {
					var date = new Date(v);
					if (date.getMinutes() % 20 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
						
						return hours + ":" + minutes + ":" + seconds;
					} else {
						return "";
					}
				};
			break;
			case "hours":
				plotOptions.xaxis.tickSize = [1, "hour"];
				plotOptions.xaxis.tickFormatter = function (v, axis) {
					var date = new Date(v);
				
					if (date.getHours() % 6 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
						
						return hours+":"+minutes;
					} else {
						return "";
					}
				};
			break;
			case "days":
				plotOptions.xaxis.tickSize = [1, "day"];
				plotOptions.xaxis.tickFormatter = function (v, axis) {
					var date = new Date(v);
				
					if (date.getDate() % 6 == 0) {
						var days = date.getDate();
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
						
						return date.getDate()+"/"+(date.getMonth()+1);
					} else {
						return "";
					}
				};
			break;
		}
		
		// Display the description
		/*var description = scope.widgetRef.widgets[name].description;
		for (k in scope.widgetRef.widgets[name]) {
			description = description.replaceAll("%"+k+"%", scope.widgetRef.widgets[name][k]);
		}
		$('[data-name="'+name+'"]').find(".widget-description").html(description);
		
		*/
		for (k in scope.widgetRef.widgets[name]) {
			$('[data-name="'+name+'"]').find('[data-var="'+k+'"]').html(scope.widgetRef.widgets[name][k]);
		}
		
		
		// Load the data
		var plot = $.plot(container, data, plotOptions);
		

	}
	
	// Display the data already
	this.onData[name](data);
}

chartLoader.prototype.pushdata = function(name, type, data, options) {
	var scope 		= this;
	var k;
	var container	= "#chart_"+name;
	
	// Add to the settings
	scope.widgetRef.widgets[name] = $.extend({
		chartType: 	"realtime",
		type:		type,
		description:"",
		name:		"Mailstack.stack",
		period:		"seconds"
	},scope.widgetRef.widgets[name],options);
	
	var plot;
	
	this.onData[name]	= function(data) {
		var plotOptions	= {
			xaxis: {
				mode: 		"time",
				tickSize: 	[1, "second"],
				axisLabel: "Time",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 10,
				tickFormatter: function (v, axis) {
					var date = new Date(v);
					
					if (date.getSeconds() % 30 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
				
						return hours + ":" + minutes + ":" + seconds;
					} else {
						return "";
					}
				}
			},
			yaxis: {
				min: 	0,
				tickFormatter: function (v, axis) {
					return v + "";
				},
				axisLabel: "Mails sent",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 6
			},
			legend: {
				show: 		false,     
				labelBoxBorderColor: "#fff"
			},
			series: {
				lines: { show: false },
				bars: {
					show: true, 
					barWidth: 1000,
					align: 'center'
				}
			}
		};
		
		switch (scope.widgetRef.widgets[name].period) {
			case "minutes":
				plotOptions.xaxis.tickSize 		= [1, "minute"];
				plotOptions.xaxis.tickFormatter = function (v, axis) {
					var date = new Date(v);
					if (date.getMinutes() % 20 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
						
						return hours + ":" + minutes + ":" + seconds;
					} else {
						return "";
					}
				};
				plotOptions.series.bars.barWidth = 30 * 1000;
			break;
			case "hours":
				plotOptions.xaxis.tickSize = [1, "hour"];
				plotOptions.xaxis.tickFormatter = function (v, axis) {
					var date = new Date(v);
				
					if (date.getHours() % 6 == 0) {
						var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
						var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
						var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
						
						return hours+":"+minutes;
					} else {
						return "";
					}
				};
				plotOptions.series.bars.barWidth = 50 * 60 * 1000;
			break;
		}
		
		for (k in scope.widgetRef.widgets[name]) {
			$('[data-name="'+name+'"]').find('[data-var="'+k+'"]').html(scope.widgetRef.widgets[name][k]);
		}
		
		// Load the data
		plot = $.plot(container, data, plotOptions);
		
	}
	
	// Display the data already
	this.onData[name](data);
}
chartLoader.prototype.growth = function(name, type, data, options) {
	var scope 		= this;
	var k;
	var container	= "#chart_"+name;
	
	// Add to the settings
	scope.widgetRef.widgets[name] = $.extend({
		chartType: 	"growth",
		type:		type,
		description:""
	},scope.widgetRef.widgets[name],options);
	
	var plot;
	
	this.onData[name]	= function(data) {
		var plotOptions	= {
			xaxis: {
				mode: 		"time",
				tickSize: 	[1, "day"],
				axisLabel: "Time",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 10,
				tickFormatter: function (v, axis) {
					var date = new Date(v);
					if (date.getDate() % 5 == 0) {
						return date.getDate() + "/" + (date.getMonth()+1)
					} else {
						return "";
					}
				}
			},
			yaxis: {
				tickFormatter: function (v, axis) {
					return v + "";
				},
				axisLabel: "Registered users",
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 12,
				axisLabelFontFamily: 'Verdana, Arial',
				axisLabelPadding: 6
			},
			legend: {
				show: 		false,     
				labelBoxBorderColor: "#fff"
			},
			series: {
				lines: {
					show: 		true,
					lineWidth: 	1.2,
					fill: 		true
				}
			}
		};
		
		// Load the data
		plot = $.plot(container, data, plotOptions);
		
	}
	
	// Display the data already
	this.onData[name](data);
}
chartLoader.prototype.users = function(name, type, data, options) {
	var scope 		= this;
	var k;
	var container	= '[data-name="'+name+'"]';
	// Add to the settings
	scope.widgetRef.widgets[name] = $.extend({
		chartType: 	"realtime",
		type:		type
	},scope.widgetRef.widgets[name],options);
	
	var plot;
	
	this.onData[name]	= function(data) {
		var ul = $(container).find(".userlist");
		ul.empty();
		var i;
		for(i=0;i<data.length;i++) {
			ul.append('<li><div class="avatar-image"><img src="'+data[i].avatar_small+'" alt="profile"/></div><span>'+data[i].firstname+'</span><div>'+(data[i].uid>0?'Facebook':'Email')+'</div></li>');
		}
		
		for (k in scope.widgetRef.widgets[name]) {
			$('[data-name="'+name+'"]').find('[data-var="'+k+'"]').html(scope.widgetRef.widgets[name][k]);
		}
	}
	
	
	// Display the data already
	this.onData[name](data);
}
chartLoader.prototype.logs = function(name, type, data, options) {
	var scope 		= this;
	var k;
	var container	= '[data-name="'+name+'"]';
	
	// Add to the settings
	scope.widgetRef.widgets[name] = $.extend({
		chartType: 	"realtime",
		name: 		"Mailstack.error",
		type:		type
	},scope.widgetRef.widgets[name],options);
	
	var plot;
	
	this.onData[name]	= function(data) {
		var ul = $(container).find(".loglist");
		ul.empty();
		var i;
		for(i=0;i<data.length;i++) {
			ul.append('<div><div>'+new Date(data[i].time).pretty()+'</div><pre>'+data[i].value+'</pre></div>');
		}
		
		for (k in scope.widgetRef.widgets[name]) {
			$('[data-name="'+name+'"]').find('[data-var="'+k+'"]').html(scope.widgetRef.widgets[name][k]);
		}
		
	}
	
	// Display the data already
	this.onData[name](data);
}
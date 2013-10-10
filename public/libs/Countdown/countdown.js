/**
	Countdown
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		countdown: function() {
			var plugin_namespace = "countdown_widget";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					
					this.options = $.extend({
						name:	"countdown",
						start:	true,
						alerts:	[],
						params:	{}
					},options);
					
					// alert flags to not repeat
					this.alerts = {};
					
					// sort the alerts asc
					this.options.alerts.sort(function(a, b) {
						return a - b;
					});
					
					this.seconds = Math.round((this.element.data("timer")-new Date().getTime())/1000);
					
					this.callback = false;
					
					// remove stopping
					window.Arbiter.subscribe("countdown.stop", function(data){
						if (data.name == scope.name) {
							clearInterval(scope.timer);
						}
					});
					
					if (this.options.start) {
						this.start();
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.start = function () {
				try {
					var scope = this;
					
					clearInterval(this.timer);
					this.timer = setInterval(function() {
						var UTCtimestamp = scope.element.data("timer");
						var d1		= new Date(UTCtimestamp);
						var d2		= new Date();
						
						var diff	= d2-d1;
						var sign	= diff<0?-1:1;
						var milliseconds;
						var seconds;
						var minutes;
						var hours;
						var days;
						var useWord	= true;
						if (scope.element.data("format") && scope.element.data("format") == "big") {
							useWord = false;
						}
						
						var diffsec = Math.abs(Math.round(diff/1000))
						var i;
						for (i=0;i<scope.options.alerts.length;i++) {
							if (diffsec <= scope.options.alerts[i] && !scope.alerts[scope.options.alerts[i]]) {
								scope.alerts[scope.options.alerts[i]] = true;
								window.Arbiter.inform(scope.options.name, {
									alert: 	scope.options.alerts[i],
									past:	diffsec < scope.options.alerts[i],
									time:	diffsec,
									name:	scope.options.name,
									params:	scope.options.params
								});
								// no more alerts
								break;
							}
						}
						
						diff	/= sign; // or diff=Math.abs(diff);
						diff	= (diff-(milliseconds=diff%1000))/1000;
						diff	= (diff-(seconds=diff%60))/60;
						diff	= (diff-(minutes=diff%60))/60;
						days	= (diff-(hours=diff%24))/24;
						
						var str 	= "";
						var parts 	= [];
						var labels	= ["days","hours","minutes","seconds"];
						var stopIndex = false;
						parts.push(days);
						parts.push(hours);
						parts.push(minutes);
						parts.push(seconds);
						
						for (i=0;i<parts.length;i++) {
							if (parts[i] > 0) {
								parts = parts.slice(i);
								stopIndex = i;
								break;
							}
						}
						if (stopIndex === false) {
							stopIndex = 0;
						}
						
						if (scope.element.data("limit")) {
							parts = parts.slice(0, scope.element.data("limit")*1);
						}
						
						
						if (scope.element.data("force") && parts.length < scope.element.data("limit")*1) {
							for (i=0;i<scope.element.data("limit")-parts.length;i++) {
								parts.splice(0,0,0);
							}
						}
						
						if (useWord) {
							for (i=0;i<parts.length;i++) {
								if (scope.element.data("force") || parts[i] > 0) {
									parts[i] = parts[i]+" "+labels[stopIndex+i];
								}
							}
						}
						// remove empty elements
						
						if (!scope.element.data("force")) {
							var buffer = [];
							for (i=0;i<parts.length;i++) {
								if (parts[i] !== 0) {
									buffer.push(parts[i]);
								}
							}
							parts = buffer;
						}
						
						
						// join
						if (parts.length == 0) {
							str = "now";
						} else if (parts.length == 1) {
							str = parts[0];
						} else if (parts.length == 2) {
							str = parts[0]+" and "+parts[1];
						} else {
							var i;
							for (i=0;i<parts.length-2;i++) {
								str += parts[i]+", ";
							}
							str += parts[parts.length-2]+" and "+parts[parts.length-1];
						};
						
						if (scope.element.data("prefix")) {
							if (scope.element.data("prefix-past") && sign == 1) {
								str = scope.element.data("prefix-past")+str+" ago";
							} else {
								str = scope.element.data("prefix")+str;
							}
						}
						
						if (scope.element.data("format") && scope.element.data("format") == "big") {
							if (parts.length == 2) {
								scope.element.html(scope.zerolead(parts[0])+":"+scope.zerolead(parts[1]));
							} else {
								scope.element.html(scope.zerolead(parts[0]));
							}
							if (scope.element.data("info")) {
								var info = $(scope.element.data("info"));
								var str = "";
								if (days > 0) {
									str = "days";
								} else if (hours > 0) {
									str = "hours";
								} else if (minutes > 0) {
									str = "minutes";
								} else if (seconds > 0) {
									str = "seconds";
								}
								if (sign == 1) {
									str = str+" late!";
								} else {
									str = str+" left";
								}
								info.html(str);
								if (scope.element.data("limit")) {
									parts = parts.slice(0, scope.element.data("limit")*1);
								}
							}
						} else {
							scope.element.html(str);
						}
						
						if (scope.element.data("pct")) {
							$(scope.element.data("pct")).animate({
								width:		(100-(seconds/scope.seconds*100))+"%"
							}, { duration: 500, queue: false });
						}
						
						if (scope.element.data("countdown") && sign >= 1) {
							
							scope.element.html(scope.element.data("end"));
							clearInterval(scope.timer);
							window.Arbiter.inform("countdown.end", {
								name:	scope.options.name
							});
							if (scope.callback) {
								scope.callback();
							}
						}
						
					},100);
					
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.zerolead = function (n) {
				if (n<10) {
					return "0"+n;
				}
				return n;
			};
			pluginClass.prototype.setCallback = function (callback) {
				try {
					
					this.callback = callback;
					
				} catch (err) {
					this.error(err);
				}
			};
			
			
			
			
			pluginClass.prototype.__init = function (element) {
				try {
					this.element = element;
				} catch (err) {
					this.error(err);
				}
			};
			// centralized error handler
			pluginClass.prototype.error = function (e) {
				if (console && console.info) {
					console.info("error on "+plugin_namespace+":",e);
				}
			};
			// Centralized routing function
			pluginClass.prototype.execute = function (fn, options) {
				try {
					if (typeof(this[fn]) == "function") {
						var output = this[fn].apply(this, [options]);
					} else {
						this.error("'"+fn.toString()+"()' is not a function");
					}
				} catch (err) {
					this.error(err);
				}
			};
			
			// process
			var fn;
			var options;
			if (arguments.length == 0) {
				fn = "init";
				options = {};
			} else if (arguments.length == 1 && typeof(arguments[0]) == 'object') {
				fn = "init";
				options = $.extend({},arguments[0]);
			} else {
				fn = arguments[0];
				options = arguments[1];
			}
			$.each(this, function(idx, item) {
				// if the plugin does not yet exist, let's create it.
				if ($(item).data(plugin_namespace) == null) {
					$(item).data(plugin_namespace, new pluginClass());
					$(item).data(plugin_namespace).__init($(item));
				}
				$(item).data(plugin_namespace).execute(fn, options);
			});
			return this;
    	}
	});
	
})(jQuery);



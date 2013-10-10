/**
	Countdown
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		timerbar: function() {
			var plugin_namespace = "timerbar_widget";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					
					this.options = $.extend({
						name:	"countdown",
						start:	true
					},options);
					
					this.callback = false;
					
					this.rainbow = new Rainbow();
					
					// Build the bar
					this.barcontainer 	= $.create("div", this.element);
					this.inner 			= $.create("div", this.barcontainer);
					this.barcontainer.addClass("timerbar");
					
					if (this.options.start) {
						this.start();
					}
					
					window.Arbiter.subscribe("timerbar.pause", function(data) {
						console.info("timerbar.pause");
						if (data.name) {
							if (data.name == scope.options.name) {
								scope.stop();
							}
						} else {
							scope.stop();
						}
					});
					window.Arbiter.subscribe("timerbar.play", function(data) {
						console.info("timerbar.play");
						if (data.name) {
							if (data.name == scope.options.name) {
								scope.start();
							}
						} else {
							scope.start();
						}
					});
					
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.start = function () {
				try {
					var scope = this;
					
					var UTCtimestamp = scope.element.data("timer");
					var d1		= new Date(UTCtimestamp);
					var d2		= new Date();
						
					this.time_total = d2-d1;
					
					clearInterval(this.timer);
					this.timer = setInterval(function() {
						var UTCtimestamp = scope.element.data("timer");
						var d1		= new Date(UTCtimestamp);
						var d2		= new Date();
						
						var diff	= d2-d1;
						var pct		= 1-(diff/scope.time_total);
						if (pct > 1) {
							pct = 1;
						}
						
						scope.rainbow.setSpectrum('6DD900', 'FF5C26');
						scope.rainbow.setNumberRange(0, 1);
						
						//console.log("pct",pct);
						scope.inner.css({
							width:				(pct*100)+"%",
							"background-color":	"#"+scope.rainbow.colourAt(pct)
						});
						
						
						if (scope.element.data("timerbar") && d2>=d1) {
							clearInterval(scope.timer);
							window.Arbiter.inform("timerbar.end", {
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
			
			pluginClass.prototype.stop = function () {
				try {
					
					window.clearInterval(this.timer);
					
				} catch (err) {
					this.error(err);
				}
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



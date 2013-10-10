/**
	photofeed
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		blurdisplay: function() {
			var plugin_namespace = "blurdisplay";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					var i;
					
					this.options = $.extend({
						onEnd: 	function() {}
					},options);
					
					this.element.empty();
					
					this.images 			= [];
					this.currentIndex		= 0;
					
					for (i=0;i<this.options.levels;i++) {
						var img = $.create("img", this.element);
						img.attr("src",this.options.directory+i+".jpg");
						img.addClass("raceimg");
						img.hide();
						this.images.push(img);
					}
					
					// Show the first image
					this.images[0].show();
					
					// calculate the timer's delay
					this.delay			= this.options.max/this.options.levels*1000;
					
					// Setup the timer
					var timerCounter 	= 0;
					this.timer 			= setInterval(function() {
						//console.log("Timer exec");
						if (!scope.showNext()) {
							clearInterval(scope.timer);
							//console.log("Timer stop");
						}
					}, this.delay);
					
					window.Arbiter.subscribe("games.stop", function(data) {
						// Stop the game, unload all events
						clearInterval(scope.timer);
					});
					
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.showNext = function () {
				try {
					
					if (this.currentIndex >= this.options.levels-1) {
						return false;
					}
					// Hide previous
					this.images[this.currentIndex].hide();
					// Increment the cursor
					this.currentIndex++;
					// Shew the new index
					this.images[this.currentIndex].show();
					
					return true;
					
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


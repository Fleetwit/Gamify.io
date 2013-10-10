/**
	formapi
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		radio: function() {
			var plugin_namespace = "plugin_radio";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					
					this.options = $.extend({
					},options);
					
					this.data	= $.extend({},this.element.data());
					
					this.hidden = $.create("input",this.element,true);
					this.hidden.type = "hidden";
					this.hidden = $(this.hidden);
					
					var attributes = this.element[0].attributes;
					
					$.each(attributes, function( index, attr ) {
						if (attr.name != "class") {
							scope.hidden.attr(attr.name, attr.value);
							scope.element.attr(attr.name, "");
						}
					});
					
					// events
					//$(this.element.children()[0]).addClass("selected");
					
					this.element.children().click(function() {
						scope.element.children().removeClass("selected");
						$(this).addClass("selected");
						scope.hidden.val($(this).attr("data-value"));
					});
					
					window.Arbiter.subscribe("radio."+this.data.name+".val", function(data){
						scope.element.children().removeClass("selected");
						scope.element.find('[data-value="'+data.val+'"]').addClass("selected");
						scope.hidden.val(data.val);
					});
					
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


/**
	formapi
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		checklist: function() {
			var plugin_namespace = "plugin_checklist";
			
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
					
					this.mousedown 	= false;
					this.dragging 	= false;
					
					var attributes = this.element[0].attributes;
					
					$.each(attributes, function( index, attr ) {
						if (attr.name != "class") {
							scope.hidden.attr(attr.name, attr.value);
							scope.element.attr(attr.name, "");
						}
					});
					
					this.selected = {};
					this.element.children().mouseup(function() {
						
						if (!scope.dragging) {
							if ($(this).hasClass("selected")) {
								$(this).removeClass("selected");
							} else {
								
								$(this).addClass("selected");
							}
							scope.serialize();
						}
					});
					this.element.mousedown(function() {
						scope.mousedown = true;
					});
					this.element.mouseup(function(e) {
						/*if (scope.dragging) {
							e.preventDefault();
							e.stopImmediatePropagation();
						}*/
						scope.mousedown = false;
						scope.dragging 	= false;
					});
					this.element.mousemove(function() {
						if (scope.mousedown) {
							scope.dragging = true;
						}
					});
					
					this.element.sortable({
						beforeStop: function(event, ui) {
							scope.serialize();
						}
					});
					
					scope.serialize();
					
					window.Arbiter.subscribe("checklist."+this.data.name+".val", function(data){
						
						if (data.val.length == 0) {
							return false;
						}
						
						var kids = scope.element.children();
						kids.removeClass("selected");
						var i;
						var j;
						var buffer = [];
						for (j=0;j<data.val.length;j++) {
							for (i=0;i<kids.length;i++) {
								if ($(kids[i]).attr("data-value") == data.val[j]) {
									$(kids[i]).addClass("selected");
									$(kids[i]).detach().appendTo(scope.element);
									//buffer.push(data[j]);
								}
							}
						}
						// another loop to move all the unselected at the bottom
						for (i=0;i<kids.length;i++) {
							if (!$(kids[i]).hasClass("selected")) {
								$(kids[i]).detach().appendTo(scope.element);
							}
						}
						scope.serialize();
					});
					
				} catch (err) {
					this.error(err);
				}
			};
			
			
			pluginClass.prototype.serialize = function () {
				try {
					var scope 	= this;
					var kids 	= this.element.children();
					var output 	= [];
					for (i=0;i<kids.length;i++) {
						if ($(kids[i]).hasClass("selected")) {
							if ($(kids[i]).attr("data-value")) {
								output.push($(kids[i]).attr("data-value"));
							}
						}
					}
					this.hidden.val(output.join(","));
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


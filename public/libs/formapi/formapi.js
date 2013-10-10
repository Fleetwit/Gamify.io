/**
	formapi
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		formapi: function() {
			var plugin_namespace = "formapi";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					
					this.options = $.extend({
						success: 	function(response) {},
						filter:		false,
						validator:	false
					},options);
					
					this.process();
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.process = function () {
				try {
					
					var scope 	= this;
					var i;
					
					// list the fields
					if (this.options.filter) {
						var required 	= this.element.find(this.options.filter).find('[data-require="true"]');
						var include 	= this.element.find(this.options.filter).find('[data-include="true"]');
					} else {
						var required 	= this.element.find('[data-require="true"]');
						var include 	= this.element.find('[data-include="true"]');
					}
					
					var data 		= {};
					var flagged		= [];
					
					
					for (i=0;i<required.length;i++) {
						var el 			= $(required[i]);
						var validated 	= this.validateField(el, false);
						if (scope.options.validator) {
							validated	= validated && scope.options.validator(el, false);
							validated	= scope.options.validator(el, false);
						}
						if (!validated) {
							flagged.push(el);
						} else {
							data[el.attr("data-name")] = this.getval(el);
							$(el).removeClass("formapi_flagged");
						}
					}
					for (i=0;i<include.length;i++) {
						var el 			= $(include[i]);
						var validated 	= this.validateField(el, true);
						if (scope.options.validator) {
							validated	= validated && scope.options.validator(el, false);
							validated	= scope.options.validator(el, false);
						}
						if (!validated) {
							flagged.push(el);
						} else {
							if (this.getval(el) != '') {
								data[el.attr("data-name")] = this.getval(el);
							}
							if ($(el).data("isdroplist")) {
								$(el).parent().find(".droplist").removeClass("formapi_flagged");;
							} else if ($(el).data("radio")) {
								$(el).parent().removeClass("formapi_flagged");;
							} else if ($(el).data("checkbox")) {
								$(el).parent().removeClass("formapi_flagged");;
							} else {
								$(el).removeClass("formapi_flagged");
							}
						}
					}
					
					// display errors
					for (i=0;i<flagged.length;i++) {
						if ($(flagged[i]).data("isdroplist")) {
							$(flagged[i]).parent().find(".droplist").addClass("formapi_flagged");
						} else if ($(flagged[i]).data("radio")) {
							$(flagged[i]).parent().addClass("formapi_flagged");
						} else if ($(flagged[i]).data("checkbox")) {
							$(flagged[i]).parent().addClass("formapi_flagged");
						} else {
							$(flagged[i]).addClass("formapi_flagged");
						}
					}
					
					if (flagged.length == 0) {
						this.options.success(data);
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.validateField = function (el, errorOnly) {
				try {
					
					var scope 	= this;
					
					if (!errorOnly) {
						if ((el.val() == '') || ( el.attr("data-placeholder") && el.val() == el.attr("data-placeholder"))) {
							return false;
						}
					}
					
					if (el.attr("data-mirror")) {
						if (this.getval(el) != this.getval($(el.attr("data-mirror")))) {
							return false;
						}
					}
					if (el.attr("data-minlen")) {
						if (this.getval(el).length < el.attr("data-minlen")) {
							return false;
						}
					}
					
					if (el.attr("data-type")) {
						switch (el.attr("data-type")) {
							case "email":
								var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]+)$/;
								if (reg.test(el.val()) == false) {
									return false;
								}
							break;
						}
					}
					if (el.attr("data-regex")) {
						var patt	=	new RegExp(el.attr("data-regex"),"");
						if (patt.test(el.val()) == false) {
							return false;
						}
					}
					
					return true;
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.getval = function (el) {
				try {
					
					var scope 	= this;
					
					
					if (el.attr("data-placeholder") && el.val() == el.attr("data-placeholder")) {
						return "";
					}
					
					return el.val();
					
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


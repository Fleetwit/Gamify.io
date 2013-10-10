/**
	formapi
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		droplist: function() {
			var plugin_namespace = "droplist";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					
					this.options = $.extend({
						
					},options);
					
					this.data	= $.extend({},this.element.data());
					
					console.log("this.data",this.data);
					
					
					this.skin();
					
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.skin = function () {
				try {
					
					var scope 	= this;
					var i;
					var j;
					
					// create the hiden field
					/*this.hidden = $.create("input", this.element.parent(), true);
					this.hidden.type = "hidden";
					this.hidden = $(this.hidden);*/
					this.hidden = $('<input type="hidden" />')
					this.hidden.appendTo(this.element.parent());
					
					// copy atributes
					var attributes = this.element[0].attributes;
					$.each(attributes, function( index, attr ) {
						if (attr.name != "class") {
							scope.hidden.attr(attr.name, attr.value);
						}
					});
					
					// create the droplist
					this.dropcontainer = $.create("div", $("body"));
					this.dropcontainer.addClass("droplist_container");
					
					// create list container
					this.ul = $.create("ul", this.dropcontainer);
					for (j in this.element.data()) {
						this.ul.attr("data-"+j, this.element.data(j));
					}
					
					// create list item
					this.list = {};
					var listItems = this.element.children();
					console.log("listItems",listItems);
					for (i=0;i<listItems.length;i++) {
						var el = $(listItems[i]);
						var li = $.create("li", this.ul);
						li.html(el.html());
						li.attr("class",el.attr("class"));
						for (j in el.data()) {
							li.attr("data-"+j, el.data(j));
						}
						if (el.attr("data-value")) {
							li.attr("data-value", el.attr("data-value"));
							console.log(">> this.list",el.attr("data-value"),{
								display: 	el.html(),
								el:			li
							});
							this.list[el.attr("data-value")] = {
								display: 	el.html(),
								el:			li
							};
						} else {
							li.attr("data-value", el.html());
							this.list[el.html] = {
								display: 	el.html(),
								el:			li
							};
						}
						el.remove();
					}
					
					// handle placeHolder
					if (this.element.attr("data-placeholder")) {
						this.element.html(this.element.attr("data-placeholder"));
					}
					
					
					// set default value if there is one
					if (this.element.attr("data-value")) {
						this.val(this.element.attr("data-value"));
					}
					
					// remove attributes
					$.each(attributes, function( index, attr ) {
						if (attr.name != "class") {
							scope.element.attr(attr.name,"");
						}
					});
					
					
					// handle clicks
					this.element.click(function() {
						console.log("click",this);
						var elPos = scope.element.offset();
						scope.dropcontainer.css({
							top:		elPos.top+scope.element.outerHeight()-3,
							left:		elPos.left,
							width:		scope.element.outerWidth()
						});
						scope.dropcontainer.slideToggle(200);
					});
					
					this.ul.on("click","li",function() {
						scope.val($(this).attr("data-value"));
					});
					
					
					//console.log("list",this.list);
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.val = function (str) {
				try {
					
					var scope 	= this;
					
					console.log(">>>",str,this.list);
					
					this.value = str;
					/*if (this.list[str].el.data("display") && this.list[str].el.data("display") != "html") {
						this.element.html(this.list[str].el.data("display"));
					} else {
						this.element.html(this.list[str].display);
					}*/
					
					this.dropcontainer.hide();
					
					this.ul.find("li").removeClass("selected")
					//this.list[str].el.addClass("selected");
					
					this.hidden.val(str);
					
					console.log("inform:: ","droplist."+this.data.name);
					/*window.Arbiter.inform("droplist."+this.data.name, {
						value:	str,
						label:	this.list[str].display
					});*/
					
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


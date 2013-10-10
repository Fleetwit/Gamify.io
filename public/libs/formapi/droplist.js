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
					
					this.uuid = $.rand()+"."+$.rand();
					
					this.state = false;
					
					this.data	= $.extend({},this.element.data());
					
					//console.log("this.data",this.data);
					
					
					this.skin();
					
					$(window).resize(function() {
						var elPos = scope.element.offset();
						scope.dropcontainer.css({
							top:		elPos.top+scope.element.outerHeight()-3,
							left:		elPos.left,
							width:		scope.element.outerWidth()
						});
					});
					
					
					window.Arbiter.subscribe("droplist.close", function(data){
						if (data.uuid != scope.uuid && scope.state == true) {
							scope.dropcontainer.slideUp(200, function() {
								
							});
							scope.state = false;
						}
					});
					window.Arbiter.subscribe("droplist."+this.data.name+".val", function(data){
						scope.val(data.val, data.stopPropagation);
					});
					
					window.Arbiter.subscribe("droplist."+this.data.name+".edit", function(data){
						if (data.push) {
							var li = $.create("li", scope.ul);
							li.html(data.push.label);
							li.attr("data-value", data.push.value);
						}
					});
					
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
					this.dropcontainer.addClass("nano");
					
					// create list container
					this.ul = $.create("ul", this.dropcontainer);
					this.ul.addClass("content");
					for (j in this.element.data()) {
						this.ul.attr("data-"+j, this.element.data(j));
					}
					
					// create list item
					this.list = {};
					var listItems = this.element.children();
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
						} else {
							li.attr("data-value", el.html());
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
					
					$("body").on("click", function(e) {
						if (scope.state) {
							scope.dropcontainer.slideUp(200, function() {
								$(".nano").nanoScroller();
							});
							scope.state = false;
						}
					});
					
					// handle clicks
					this.element.click(function(e) {
						e.preventDefault();
						e.stopImmediatePropagation();
						
						var h = 0;
						var i;
						scope.dropcontainer.show();
						var ch = scope.dropcontainer.find("ul.content > li");
						
						for (i=0;i<ch.length;i++) {
							h += $(ch[i]).outerHeight();
						}
						if (h > 400) {
							h = 400;
						}
						scope.dropcontainer.hide();
						
						var elPos = scope.element.offset();
						scope.dropcontainer.css({
							top:		elPos.top+scope.element.outerHeight()-3,
							left:		elPos.left,
							width:		scope.element.outerWidth(),
							height:		h
						});
						if (scope.state) {
							scope.dropcontainer.slideUp(200, function() {
								$(".nano").nanoScroller();
							});
						} else {
							window.Arbiter.inform("droplist.close", {
								uuid:	scope.uuid
							});
							scope.dropcontainer.slideDown(200, function() {
								$(".nano").nanoScroller();
							});
						}
						scope.state = !scope.state;
					});
					
					this.ul.on("click","li",function() {
						if (scope.state) {
							scope.dropcontainer.slideUp(200, function() {
								$(".nano").nanoScroller();
							});
						} else {
							window.Arbiter.inform("droplist.close", {
								uuid:	scope.uuid
							});
							scope.dropcontainer.slideDown(200, function() {
								$(".nano").nanoScroller();
							});
						}
						scope.state = !scope.state;
						scope.val($(this).attr("data-value"));
					});
					
					
					//console.log("list",this.list);
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.val = function (str, stopPropagation) {
				try {
					
					var scope 	= this;
					
					//console.log("val",str);
					
					var el = this.dropcontainer.find('[data-value="'+str+'"]');
					
					this.value = str;
					if (el.data("display") && el.data("display") != "html") {
						this.element.html(el.data("display"));
					} else {
						this.element.html(el.clone().html());
					}
					
					//this.dropcontainer.hide();
					
					this.ul.find("li").removeClass("selected")
					el.addClass("selected");
					
					this.hidden.val(str);
					
					if (stopPropagation) {
						return true;	// prevent the code from goign further
					}
					window.Arbiter.inform("droplist."+this.data.name, {
						value:	str,
						label:	this.element.html(),
						el:		this.element
					});
					
					if (this.element.data("event")) {
						window.Arbiter.inform("droplist."+this.element.data("event"), {
							value:	str,
							label:	this.element.html(),
							el:		this.element
						});
					}
					
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


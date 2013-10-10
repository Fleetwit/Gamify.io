/**
	formapi:tabs
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		jtabs: function() {
			var plugin_namespace = "jtabs";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					var i, j;
					
					this.options = $.extend({
						nodefault:	false
					},options);
					
					
					// find the scopes
					this.scopes = {};
					var panels = this.element.find("[data-scope][data-panel]");
					console.log("panels",panels);
					for (i=0;i<panels.length;i++) {
						var _scope 		= $(panels[i]).data("scope");
						var _panel 		= $(panels[i]).data("panel");
						var _default 	= $(panels[i]).data("default");
						var _panels		= $('[data-scope="'+_scope+'"][data-tab="'+_panel+'"]');
						
						if (!this.scopes[_scope]) {
							this.scopes[_scope] = {
								triggers:	$(),
								panels:		{},
								allPanels:	$(),
								d:			$()		// default. Stupid IE doesn't support "default" as an attribute name...
							};
						}
						this.scopes[_scope].triggers = this.scopes[_scope].triggers.add($(panels[i]));
						
						if (_default) {
							this.scopes[_scope].d = $(panels[i]);
						}
						
						for (j=0;j<_panels.length;j++) {
							var tab	= $(_panels[j]).data("tab");
							if (!this.scopes[_scope].panels[tab]) {
								this.scopes[_scope].panels[tab] = $();
							}
							this.scopes[_scope].panels[tab] = this.scopes[_scope].panels[tab].add($(_panels[j]));
							this.scopes[_scope].allPanels = this.scopes[_scope].allPanels.add($(_panels[j]));
						}
					}
					
					console.log("this.scopes",this.scopes);
					
					// handle clicks ad defaults
					for (i in this.scopes) {
						this.scopes[i].triggers.click(function() {
							console.log("click",this);
							scope.onClick(this);
						});
						this.scopes[i].d.click();
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.onClick = function (el) {
				try {
					var scope = this;
					
					$(".nano").nanoScroller();
					
					var _scope 	= $(el).data("scope");
					var _panel 	= $(el).data("panel");
					
					if (this.scopes[_scope] && this.scopes[_scope].panels[_panel]) {
						
						window.Arbiter.inform("tab.change."+_scope+'.before', {
							scope: 		_scope,
							tab:		$(el),
							panel:		this.scopes[_scope].panels[_panel],
							instance:	scope
						});
						
						this.scopes[_scope].allPanels.hide();
						
						this.scopes[_scope].panels[_panel].show();
						
						this.scopes[_scope].triggers.removeClass("active");
						$(el).addClass("active");
						
						window.Arbiter.inform("tab.change."+_scope, {
							scope: 		_scope,
							tab:		$(el),
							panel:		this.scopes[_scope].panels[_panel],
							instance:	scope
						});
					}
				} catch (err) {
					this.error(err);
				}
			};
			
			pluginClass.prototype.select_current = function (options) {
				try {
					var scope = this;
					
					var _scope 	= options.scope;
						
					// Check if there is already a selected tab
					var selectedTab = this.element.find('.selected[data-scope="'+_scope+'"][data-panel]');
					if (selectedTab.length > 0) {
						var el 		= selectedTab;
						var _panel 	= $(el).data("container");
					} else {
						var el 		= $(this.element.find('[data-scope="'+_scope+'"][data-panel]')[0]);
						var _panel 	= $(el).data("panel");
					}
					
					console.log("el",el);
					console.log("_scope",_scope);
					console.log("_panel",_panel);
					
					if (this.scopes[_scope] && this.scopes[_scope].panels[_panel]) {
					
						this.scopes[_scope].allPanels.hide();
						
						this.scopes[_scope].panels[_panel].show();
						
						this.scopes[_scope].triggers.removeClass("active");
						$(el).addClass("active");
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

/**
	jSurvey
	@version:		1.0.0
	@author:		Julien Loutre <julien.loutre@gmail.com>
*/
(function($){
 	$.fn.extend({
 		jsurvey: function() {
			var plugin_namespace = "jsurvey";
			
			var pluginClass = function() {};
			
			pluginClass.prototype.init = function (options) {
				try {
					
					var scope = this;
					var i;
					var j;
					
					this.options = $.extend({
						survey:			[],
						penalty:		false,
						onSubmit:		function() {},
						onGroupChange:	function() {},
						onPenalty:		function() {}
					},options);
					
					this.element.addClass("jsurvey");
					
					this.stack = [];
					
					this.fields		= {};
					
					this.render(this.options.survey);
					
					/*if (!this.options.quiz) {
						this.validator = function(el, errorOnly){
							return true
						};
					} else {
						this.validator = function(el, errorOnly) {
							return scope.quizValidate(el, errorOnly);
						};
					}*/
					
					if (!this.options.quiz) {
						/*this.validator = function(el, errorOnly){
							return true
						};*/
						this.validator = false;
					} else {
						this.validator = function(el, errorOnly) {
							var output = scope.quizValidate(el, errorOnly);
							if (!output && scope.options.penalty) {
								scope.options.onPenalty();
							}
							return output;
						};
					}
					
					this.element.attr("tabindex",1).bind("keydown", function(e) {
						e.stopImmediatePropagation();
						if (e.keyCode == 13) {
							scope.submitForm();
						}
					});
					
					this.options.submit.click(function() {
						scope.element.formapi({
							validator:	scope.validator,
							success: 	function(response) {
								console.info("response",response);
								scope.options.onSubmit(response);
							}
						});
					});
					
					
					// Manage Grouping
					if (this.options.group) {
						// find groups
						this.groups = {};
						var rows = this.element.find("[data-group]");
						//console.log("rows",rows, this.element);
						this.min = 1000;
						this.max = 0;
						for (i=0;i<rows.length;i++) {
							var groupid = $(rows[i]).data("group");
							if (!this.groups[groupid]) {
								this.groups[groupid] = $();
							}
							this.groups[groupid] = this.groups[groupid].add($(rows[i]));
							//$(rows[i]).hide();
							this.groups[groupid].hide();
							if (groupid < this.min) {
								this.min = groupid;
							}
							if (groupid > this.max) {
								this.max = groupid;
							}
						}
						//console.log("this.groups",this.groups);
						// Show the default group #1
						this.currentgroup = 1;
						this.groups[this.currentgroup].show();
						scope.displayGroup({
							group:		scope.currentgroup,
							validate:	false,
							animate:	false
						});
						
						// count number of groups
						var groupcount = 0;
						for (j in this.groups) {
							groupcount++;
						}
						
						// hide previous and submit
						this.options.previous.hide();
						this.options.submit.hide();
						
						if (groupcount <= 1) {
							this.options.previous.hide();
							this.options.next.hide();
							this.options.submit.show();
						}
						
						// next & previous event handlers
						this.options.next.click(function() {
							scope.displayGroup({group:scope.currentgroup+1});
						});
						this.options.previous.click(function() {
							scope.displayGroup({group:scope.currentgroup-1});
						});
					} else {
						scope.options.previous.hide();
						scope.options.next.hide();
					}
					
					
					// Now put the focus on the first text field
					this.element.find('input[type="text"]').first().focus();
					
					window.Arbiter.subscribe("games.stop", function(data) {
						// Stop the game, unload all events
						console.log("receiving order to stop...");
						scope.element.remove();
					});


					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.submitForm = function (options) {
				try {
					if (this.options.next.is(":visible")) {
						this.options.next.click();
					} else {
						this.options.submit.click();
					}
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.displayGroup = function (options) {
				try {
					options = $.extend({
						animate:	true,
						validate:	true,
						group:		1
					},options);
					
					// Make sure this is an int
					options.group = options.group*1;
					
					if (options.group < this.min || options.group > this.max) {
						return false;
					}
					
					var scope = this;
					
					var displayFunction = function() {
						//console.info("response",response);
						if (scope.min == scope.max) {
							// only one group
							scope.options.previous.hide();
							scope.options.next.hide();
							scope.options.submit.show();
						} else {
							if (options.group == scope.max) {
								scope.options.previous.show();
								scope.options.next.hide();
								scope.options.submit.show();
							} else if (options.group == scope.min) {
								scope.options.previous.hide();
								scope.options.next.show();
								scope.options.submit.hide();
							} else {
								scope.options.previous.show();
								scope.options.next.show();
								scope.options.submit.hide();
							}
						}
						
						if (scope.groups[options.group]) {
							if (options.animate) {
								// Close current group
								scope.groups[scope.currentgroup].slideUp();
								// Show new group
								scope.groups[options.group].slideDown();
							} else {
								// Close current group
								scope.groups[scope.currentgroup].hide();
								// Show new group
								scope.groups[options.group].show();
							}
							
							// Trigger the callback
							scope.options.onGroupChange(options.group);
							// Update the current group number
							scope.currentgroup = options.group;
						} else {
							return false;
						}
					};
					
					if (!options.validate) {
						displayFunction();
					} else {
						scope.element.formapi({
							validator:	scope.validator,
							filter:	'[data-group="'+scope.currentgroup+'"]',
							success: function(response) {
								displayFunction();
							}
						});
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.render = function () {
				try {
					
					var scope = this;
					var i;
					
					this.container		= $.create("div", this.element);
					this.container.addClass("form");
					if (this.options.quiz || this.options.block) {
						this.container.addClass("block");
					}
					
					for (i=0;i<this.options.survey.length;i++) {
						// create
						this.parseItem(this.options.survey[i]);
					}
					
					for (i=0;i<this.stack.length;i++) {
						// activate
						this.renderItem(this.stack[i]);
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.parseItem = function (item) {
				try {
					
					
					var scope = this;
					var i;
					var j;
					var name;
					var data;
					var el;
					
					for (name in item) {
						data = item[name];
					}
					
					var defer = false;	// defer the active component to a sub div (image-pixelate for example, where the radios are in a subdiv)
					
					switch (data.type) {
						default:
						case "varchar":
							this.fields[name] 			= $.create("input",$(),true);
							this.fields[name].type 		= "text";
							this.fields[name] 			= $(this.fields[name]);
						break;
						case "image-varchar":
							this.fields[name] 		= $.create("div",$());
							var img					= $.create("img",this.fields[name]);
							img.attr("src",data.image);
							img.addClass("raceimg");
							var field  				= $.create("input",this.fields[name],true);
							field.type 				= "text";
							field 					= $(field);
							defer 					= field;
						break;
						case "pixelate-varchar":
							this.fields[name] 		= $.create("div",$());
							var img					= $.create("div",this.fields[name]);
							img.addClass("blurcontainer");
							var field  				= $.create("input",this.fields[name],true);
							field.type 				= "text";
							field 					= $(field);
							defer 					= field;
						break;
						case "password":
							this.fields[name] 			= $.create("input",$(),true);
							this.fields[name].type 		= "password";
							this.fields[name] 			= $(this.fields[name]);
						break;
						case "text":
							this.fields[name] 			= $.create("textarea",$());
						break;
						case "list":
							this.fields[name] 			= $.create("div",$());
							this.fields[name].addClass("droplist");
							this.fields[name].attr("data-isdroplist",true);
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", scope.fields[name]);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "checkbox":
							this.fields[name] 		= $.create("div",$());
							this.fields[name].addClass("checkbox");
							this.fields[name].attr("data-checkbox",name);
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", scope.fields[name]);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "checklist":
							this.fields[name] 		= $.create("div",$());
							this.fields[name].addClass("checklist");
							this.fields[name].attr("data-checklist",name);
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", scope.fields[name]);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "radio":
							this.fields[name] 		= $.create("div",$());
							this.fields[name].addClass("radio");
							this.fields[name].attr("data-radio",name);
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", scope.fields[name]);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "image-radio":
							this.fields[name] 		= $.create("div",$());
							var img					= $.create("img",this.fields[name]);
							img.attr("src",data.image);
							img.addClass("raceimg");
							var radios				= $.create("div",this.fields[name]);
							radios.addClass("radio");
							radios.attr("data-radio",name);
							defer = radios;
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", radios);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "image-quiz":
							this.fields[name] 		= $.create("div",$());
							var radios				= $.create("div",this.fields[name]);
							radios.addClass("radio").addClass("deep").addClass("div-inline");
							radios.attr("data-radio",name);
							defer = radios;
							for (i=0;i<data.list.length;i++) {
								
								(function(i){
									var listitem	= $.create("div", radios);
									listitem.attr("data-value", data.list[i].value);
									var img			= $.create("img",listitem);
									if (i%2) {
										listitem.addClass("odd");
									}
									img.attr("src",data.list[i].image);
									var radioitem	= $.create("div", listitem);
										radioitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "pixelate-radio":
							this.fields[name] 		= $.create("div",$());
							var img					= $.create("div",this.fields[name]);
							img.addClass("blurcontainer");
							var radios				= $.create("div",this.fields[name]);
							radios.addClass("radio");
							radios.attr("data-radio",name);
							defer = radios;
							for (i=0;i<data.list.length;i++) {
								(function(i){
									var listitem	= $.create("div", radios);
										listitem.attr("data-value", data.list[i].value);
										listitem.html(data.list[i].label);
								})(i);
							}
						break;
						case "scale":
							this.fields[name] 		= $.create("ul",$());
							this.fields[name].addClass("scale radio");
							this.fields[name].addClass("inline");
							this.fields[name].attr("data-scale",name);
							for (i=data.scale.min;i<=data.scale.max;i++) {
								(function(i){
									var listitem	= $.create("li", scope.fields[name]);
										listitem.attr("data-value", i);
										listitem.html(i);
										listitem.addClass("radio");
								})(i);
							}
						break;
					}
					
					if (data.regex) {
						this.fields[name].attr("data-regex", data.regex);
					}
					
					if (data.placeholder) {
						if (!defer) {
							this.fields[name].attr("data-placeholder", data.placeholder);
						}else {
							defer.attr("data-placeholder", data.placeholder);
						}
					}
					if (data.mask) {
						this.fields[name].attr("data-mask", data.mask);
						this.fields[name].mask(data.mask);
					}
					if (data.required) {
						if (!defer) {
							this.fields[name].attr("data-require", true);
						} else {
							defer.attr("data-require", true);
						}
					}
					if (data.mirror) {
						this.fields[name].attr("data-mirror", '[data-name='+data.mirror+']');
					}
					if (data.minlen) {
						this.fields[name].attr("data-minlen", data.minlen);
					}
					if (data.pixelate) {
						this.fields[name].find(".blurcontainer").blurdisplay(data.pixelate);
					}
					if (data.answer != undefined) {
						if (!this.answers) {
							this.answers = {};
						}
						this.answers[name] = data.answer;
					}
					
					console.log("defer",defer,name);
					
					if (!defer) {
						this.fields[name].attr("data-name", name);
						this.fields[name].attr("data-include", true);
					} else {
						defer.attr("data-name", name);
						defer.attr("data-include", true);
					}
					
					this.stack.push({
						name:		name,
						data:		data,
						label:		data.label,
						el:			this.fields[name],
						attr:		data.attr,
						helper:		data.clue?data.clue:false
					});
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.renderItem = function (item) {
				try {
					
					var scope = this;
					
					var row = $.create("div", this.container);
						row.addClass("row");
						row.addClass("jsurvey-"+item.data.type);
					
					if (item.label) {
						var label = $.create("div", row);
							label.addClass("label");
							label.html(item.label);
					} else {
						row.addClass("nolabel");
					}
					var field = $.create("div", row);
						field.addClass("field");
					
					if (item.attr) {
						row.attr(item.attr);
					}
					
					field.append(item.el);
					
					if (item.helper) {
						var helper = $.create("div", field)
						helper.addClass("helper");
						helper.html(item.helper);
					}
					
					// init the components
					switch (item.data.type) {
						default:
						case "varchar":
						case "text":
							
						break;
						case "list":
							this.fields[item.name].droplist();
						break;
						case "radio":
						case "scale":
							this.fields[item.name].radio();
						break;
						case "pixelate-radio":
						case "image-radio":
						case "image-quiz":
							this.fields[item.name].find(".radio").radio();
						break;
						case "checkbox":
							this.fields[item.name].checkbox();
						break;
						case "checklist":
							this.fields[item.name].checklist();
						break;
					}
					
					// Set default values
					if (item.data.value && item.data.value != "") {
						switch (item.data.type) {
							default:
							case "varchar":
							case "text":
								this.fields[item.name].val(item.data.value);
							break;
							case "list":
								window.Arbiter.inform("droplist."+item.name+".val", {
									val:	item.data.value
								});
							break;
							case "radio":
							case "scale":
							case "image-pixelate":
							case "image-radio":
								window.Arbiter.inform("radio."+item.name+".val", {
									val:	item.data.value
								});
							break;
							case "checkbox":
								window.Arbiter.inform("checkbox."+item.name+".val", {
									val:	item.data.value
								});
							break;
							case "checklist":
								window.Arbiter.inform("checklist."+item.name+".val", {
									val:	item.data.value
								});
							break;
						}
					}
					
					// Init the placeholders
					switch (item.data.type) {
						default:
						case "varchar":
						case "text":
							$("[data-placeholder]").jplaceholder();
						break;
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.fill = function (data) {
				try {
					var scope = this;
					var j;
					
					//console.log("fill",data);
					
					for (j in data) {
						
						var el = this.fields[j];
						if (el.hasClass("droplist")) {
							window.Arbiter.inform("droplist."+j+".val", {
								val:				data[j],
								stopPropagation:	true
							});
						} else {
							el.val(data[j]);
						}
					}
					
				} catch (err) {
					this.error(err);
				}
			};
			pluginClass.prototype.quizValidate = function (el, errorOnly) {
				try {
					var scope = this;
					var i;
					var j;
					
					var elName = $(el).data("name");
					//console.log("this.answers",this.answers);
					if ($.isArray(this.answers[elName])) {
						// more than one valid answer
						for (i=0;i<this.answers[elName].length;i++) {
							if (this.answers[elName][i].toLowerCase() == $(el).val().toLowerCase()) {
								return true
							}
						}
						return false;
					} else {
						if (this.answers[elName].toLowerCase() != $(el).val().toLowerCase()) {
							return false;
						}
					}
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


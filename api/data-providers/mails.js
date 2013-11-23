var _ 					= require('underscore');
var Twig				= require("twig").twig;

exports.dataProvider = function (Gamify) {
	
	Gamify.data.mails = new (function() {
		
		console.log("Mail loader loaded.");
		
		
		var scope 				= this;
		
		this.templates_uuid 	= {};
		this.templates_alias 	= {};
		this.master_template 	= "";
		
		this.refresh = function(callback) {
			scope.mongo.find({
				collection:	"mailtemplates",
				limit:		500
			}, function(response) {
				
				scope.templates_uuid 	= Gamify.utils.indexed(response[0].templates, "uuid");
				scope.templates_alias 	= Gamify.utils.indexed(response[0].templates, "alias");
				
				this.timer = setTimeout(function() {
					scope.refresh();
				}, Gamify.settings.mail_update_interval);
				
			});
		};
		this.getByUuid = function(uuid) {
			if (scope.templates_uuid[uuid]) {
				return scope.templates_uuid[uuid];
			} else {
				return false;
			}
		};
		this.getByAlias = function(alias) {
			if (scope.templates_alias[alias]) {
				return scope.templates_alias[alias];
			} else {
				return false;
			}
		};
		this.render = function(alias, params) {
			
			if (scope.templates_alias[alias]) {
				
				var raw					= scope.templates_alias[alias];
				
				var template_subject 	= Twig({
					data: 	raw.subject
				});
				
				var template_body 		= Twig({
					data: 	raw.html
				});
				
				var master_body 		= Twig({
					data: 	scope.getByAlias("master").html
				});
				
				var rendered_subject	= template_subject.render(params);
				var rendered_body 		= template_body.render(params);
				
				if (raw.nl2br) {
					var breakTag = "<br />";
					rendered_body = rendered_body.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
				}
				
				rendered_body 		= master_body.render({
					body:	rendered_body
				});
				
				return {
					subject:	rendered_subject,
					body:		rendered_body,
					raw:		raw
				};
				
			} else {
				return false;
			}
		};
		
		this.mongo	= new Gamify.mongo({database: Gamify.settings.db});
		this.mongo.init(function() {
			scope.refresh();
		});
		
	})();
	
};
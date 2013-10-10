
	$(function() {
		
		// extend the jQuery Object
		$.extend({
			// a reference to the Arbiter class
			arbiter: 	window.Arbiter,
			
			// Studnet API Call function
			apicall:	function(options) {
				/*
				method,
				id,
				params
				*/
				options = $.extend({
					method:		"",
					params:		{},
					id:			0,
					callback:	function(data) {},
					onFail:		function(data) {}
				},options);
				
				var query = {
					method:		options.method,
					params:		options.params
				};
				
				if (options.anon !== true && query.params.authtoken != undefined && (query.params.authtoken == "" || query.params.authtoken === false)) {
					$.jGrowl("You need to be logged in to take this action.", { header: 'Important' });
					options.onFail("You need to be logged in to take this action!!.");
					return false;
				}
				
				console.log("loadingoverlay",$(".loadingoverlay"));
				$(".loadingoverlay").show();
				
				$.ajax({
					url: 		"/api",		// static url for the API calls
					dataType:	"json",
					type:		"POST",
					data:		query,
					success: 	function(data){
						// check for error
						if (data.error && data.error == true) {
							if (data.message) {
								//alert(data.message);
								$.jGrowl(data.message, { header: 'Important' });
								options.onFail(data.message);
								$(".loadingoverlay").hide();
								return false;
							} else {
								//alert("Unknown error loading the data");
								options.onFail("Unknown error loading the data");
								$(".loadingoverlay").hide();
								return false;
							}
						}
						$(".loadingoverlay").hide();
						options.callback(data);
					},
					error: function(jqXHR, data, errorThrown) {
						options.onFail("Response Format Error");	
						$(".loadingoverlay").hide();
					}
				});
				
			}
		});
		
	});
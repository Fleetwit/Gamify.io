$(function() {
	
	// Droplist
	$(".droplist").droplist();
	
	// Masks
	(function() {
		var i;
		var formapi_masked = $("input[data-mask]");
		for (i=0;i<formapi_masked.length;i++) {
			$(formapi_masked[i]).mask($(formapi_masked[i]).attr("data-mask"));
		}
	})();
	
	// Placeholders
	$("input[data-placeholder]").jplaceholder();
	$("div.radio").radio();
});
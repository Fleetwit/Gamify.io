var _ 					= require('underscore');
/*
 * GET home page.
 */

exports.index = function(req, res){
	res.cookie('authtoken', '');
};
var os = require("os");
var helpers = require("../helpers");



var task =  function(request, callback){

	var algorithms = request.body.alg ? Object.keys(request.body.alg) : [];
	var loopCount = request.body.loop ? request.body.loop : 1;
	var doc = request.body.txt ? request.body.txt : "";


	helpers.calculateMultiDigest(doc,
		algorithms,
		function(err, digests) {
			callback(null, digests.join("<br>") + ("<hr>  <br>Service provided by: " + os.hostname()));	
		},
		loopCount);


}

exports.action = task

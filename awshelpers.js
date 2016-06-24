(function() {
	var AWS = require("aws-sdk");

	var initAWS = function(start, configFilePath) {
			start = start || function() {};
			
			configFilePath = configFilePath || " ";
			
			var EC2MCred = new AWS.EC2MetadataCredentials();
			
			EC2MCred.refresh(function(err){
				if(err){
					console.log(err +" - Unable to find credentials in instance metadata. Trying to load config from file " + configFilePath);
					AWS.config.loadFromPath(configFilePath);								
				}
				start(AWS);
			});
		}


module.exports.initAWS = initAWS;

})()
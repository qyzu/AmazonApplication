var util = require("util");
var helpers = require("../helpers");
var Policy = require("../s3post").Policy;
var S3Form = require("../s3post").S3Form;
var AWS_CONFIG_FILE = "config.json";
var POLICY_FILE = "policy.json";
var INDEX_TEMPLATE = "index.ejs";
var AWS = require("aws-sdk");
AWS.config.loadFromPath('./config.json');
var AWS_CONFIG_FILE = "config.json";


var task = function(request, callback){
		//1. load configuration
		var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
		var policyData = helpers.readJSONFile(POLICY_FILE);

		//2. prepare policy
		var policy = new Policy(policyData);

		//3. generate form fields for S3 POST
		var s3Form = new S3Form(policy);

		//4. get bucket name
		var formFields = s3Form.generateS3FormFields();
		formFields = s3Form.addS3CredientalsFields(formFields, awsConfig);

		var bucketName = policy.getConditionValueByKey("bucket");
		var bucketKey = "klys.student/";

		//Pobieram nazwy plikow w celu wyswietlenia ich:
		updateUploadedFilesList(bucketName, bucketKey, function(err, contents) {
			 var filesList = [];
			 for(var i=0; i<contents.length; ++i) {
				   console.log(contents[i].Key);
				   filesList.push(contents[i].Key);
		   }
			 callback(null, {template: INDEX_TEMPLATE, params:{fields:formFields, bucket:bucketName, s3FilesList:filesList}});
	 });
}

function updateUploadedFilesList(bucketName, bucketKey, callback) {
	  console.log("Updating files list for " + bucketName + " " + bucketKey + ":");
		var params = { Bucket: bucketName, Prefix: bucketKey };
    var s3 = new AWS.S3();
    s3.listObjects(params, function(err, data) {
        if (err) {
					  console.log(err, err.stack); // an error occurred
        } else {
            console.log("Pobrano liste nazw plikow!"); // successful response
						callback(null, data.Contents);
        }
    });
}

exports.action = task;

var INDEX_TEMPLATE = "index.ejs";
var AWS = require("aws-sdk");


function updateUploadedFilesList(bucketName, bucketKey, formFields, callback) {
	updateFilesList(bucketName, bucketKey, function(err, contents) {
		 var filesList = [];
		 for(var i=0; i<contents.length; ++i) {
				 console.log(contents[i].Key);
				 filesList.push(contents[i].Key);
		 }
		 callback(null, {template: INDEX_TEMPLATE, params:{fields:formFields, bucket:bucketName, s3FilesList:filesList}});
	});
}

function updateFilesList(bucketName, bucketKey, callback) {
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

exports.updateUploadedFilesList = updateUploadedFilesList;

var AWS = require("aws-sdk");
var helpers = require("../helpers");
var simpledb = require('simpledb');
var sqs = require('./sqs');
AWS.config.loadFromPath('./config.json');
var POLICY_FILE = "policy.json";
var AWS_CONFIG_FILE = "config.json";
//var Policy = require("../s3post").Policy;
//var S3Form = require("../s3post").S3Form;
//var filesListUpdater = require('./filesListUpdater');


//Response after file uploading:
var task = function(request, callback) {
    var params = {
        Bucket: request.query["bucket"], /* required */
        Key: request.query["key"], /* required */
    };
    getUploadedFileFromS3(request, params);
    //Pobieram zaktualizowana liste nazw plikow w celu wyswietlenia jej (NOT WORKING):
    //pdateUploadedFilesList(params.Bucket, params.Key, formFields, callback)}});
}

//Metoda sprawdzajaca czy sie udalo zuploadowac plik i dodac do S3:
function getUploadedFileFromS3(request, params) {
    //Pobranie zapisanego obiektu z S3:
    var s3 = new AWS.S3();
    s3.getObject(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
        } else {
          //Successful response:
          //console.log(data);
          console.log("ADDING MESSAGE TO SIMPLE_DB:\n");
          addLogsToSimpleDB(data, params);
        }
    });
}

function addLogsToSimpleDB(data, params) {
    //Wyliczenie dla niego wartosci skrotu:
    var digets = helpers.calculateDigest("MD5", data.Body);

    //Wysylanie logow do SImpleDB po wyliczeniu skrotu:
    var domainName = 'klysSimpleDB';
    var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
    var sdb      = new simpledb.SimpleDB({keyid:awsConfig.accessKeyId,secret:awsConfig.secretAccessKey})

    sdb.createDomain(domainName, function(error) {
      sdb.putItem(domainName, 'item1', {attr1:params.Bucket, attr2:params.Key, attr3:digets}, function( error ) {
        sdb.getItem(domainName, 'item1', function( error, result ) {
          console.log('Bucket = '+ result.attr1 )
          console.log('Key = '+ result.attr2 )
          console.log('Skrot = '+ result.attr3 )
        })
      })
    })
}

exports.action = task

var SQSCommand = require("./sqscommand");
var helpers = require("../helpers");
var Queue = require("queuemanager");

function addItemToSQS(message) {

	var AWS_CONFIG_FILE = "./config.json";
	var APP_CONFIG_FILE = "./package.json";
	var QueueUrl = "https://sqs.us-west-2.amazonaws.com/983680736795/klysSQS";

	var sendMessageToSQS = function(AWS) {
			var appConfig = helpers.readJSONFile(APP_CONFIG_FILE);
			var queue = new Queue(new AWS.SQS(), QueueUrl);
			var sqsCommand = new SQSCommand(queue);

			var commandType = "send";
			sqsCommand.execCommand(commandType, message, function(err, data) {
					if(err) {
						console.log("'" + commandType + "' command error: " + err);
					}
					else {
						console.log("'" + commandType + "' command executed: " + JSON.stringify(data));
					}
			});
	};

	require("../awshelpers").initAWS(sendMessageToSQS, AWS_CONFIG_FILE);
}

exports.addItemToSQS = addItemToSQS;

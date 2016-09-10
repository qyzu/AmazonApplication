var sqs = require('./sqs');

var task = function(request, callback) {

   var jsonElements = JSON.parse(JSON.stringify(request.body));
   console.log("JSON elements:\n");
   for(var key in jsonElements) {
        console.log(jsonElements[key]);
        sqs.addItemToSQS("lab4-weeia;" + jsonElements[key]);
   }
   callback(null, request.body);
}

exports.action = task;

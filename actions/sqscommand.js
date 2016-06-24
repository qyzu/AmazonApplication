var SqsCommands = function(queue){
	this.queue = queue;
	this.actions = {};
	var _this = this;
	this.actions["send"] = function(message, callback){
			_this.queue.sendMessage(message, function(err, data){
				if(err) { callback(err); return; }
				callback(null, {MessageId : data.MessageId,
								 MD5OfMessageBody : data.MD5OfMessageBody})
			});
	};
	this.actions["recv"] = function(param,callback){
			_this.queue.receiveMessage(function(err, data){
				if(err) { callback(err); return; }
				callback(null, {Body : data.Body,
								 MD5OfBody : data.MD5OfBody})
			});
	};

	this.actions["help"] = function(param, callback){
		callback(null, "Avaliable commands: " + Object.keys(_this.actions).join(", "));
	};
}

SqsCommands.prototype.execCommand = function(name, param, callback){
	if(this.actions[name]){
		this.actions[name](param, callback);
	}else {
		callback("unknown command: " + name);
	}
}

module.exports = SqsCommands;

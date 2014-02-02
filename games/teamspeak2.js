var async = require('async');

module.exports = require('./protocols/core').extend({
	init: function() {
		this._super();
		this.pretty = 'Teamspeak 2';
		this.options.port = 8767;
		this.options.master_port = 51234;
	},
	run: function(state) {
		var self = this;
		
		var port = this.options.port;
		this.options.port = this.options.master_port;
		
		async.series([
			function(c) {
				self.sendCommand('sel '+port, function(data) {
					if(data != '[TS]') self.fatal('Invalid header');
					c();
				});
			},
			function(c) {
				self.sendCommand('si', function(data) {
					var split = data.split('\r\n');
					split.forEach(function(line) {
						var equals = line.indexOf('=');
						var key = line.substr(0,equals);
						var value = line.substr(equals+1);
						state.raw[key] = value;
					});
					c();
				});
			},
			function(c) {
				self.sendCommand('pl', function(data) {
					var split = data.split('\r\n');
					var fields = split.shift().split('\t');
					split.forEach(function(line) {
						var split2 = line.split('\t');
						var player = {};
						split2.forEach(function(value,i) {
							var key = fields[i];
							if(!key) return;
							if(key == 'nick') key = 'name';
							if(m = value.match(/^"(.*)"$/)) value = m[1];
							player[key] = value;
						});
						state.players.push(player);
					});
					c();
				});
			},
			function(c) {
				self.sendCommand('cl', function(data) {
					var split = data.split('\r\n');
					var fields = split.shift().split('\t');
					state.raw.channels = [];
					split.forEach(function(line) {
						var split2 = line.split('\t');
						var channel = {};
						split2.forEach(function(value,i) {
							var key = fields[i];
							if(!key) return;
							if(m = value.match(/^"(.*)"$/)) value = m[1];
							channel[key] = value;
						});
						state.raw.channels.push(channel);
					});
					c();
				});
			},
			function(c) {
				self.finish(state);
			}
		]);
	},
	sendCommand: function(cmd,c) {
		this.tcpSend(cmd+'\x0A', function(buffer) {
			if(buffer.length < 6) return;
			if(buffer.slice(-6).toString() != '\r\nOK\r\n') return;
			c(buffer.slice(0,-6).toString());
			return true;
		});
	}
});

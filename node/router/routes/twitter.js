/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var xsenv = require("sap-xsenv");
var express = require("express");
var twitter = require("twitter");
var msg;

xsenv.loadEnv();

var client = new twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	request_options: {
		proxy: process.env.TWITTER_PROXY
	}
});

module.exports = function() {
	var app = express.Router();

	app.get("/start", function(req, res) {
		if (typeof client.currentTwitterStream !== "undefined") {
			msg = "Stop";
			console.log(msg);
			client.currentTwitterStream.destroy();
		}
		var hdiClient = req.db;
		var track = req.query.track;
		if (track !== undefined) {
			var sql = "INSERT INTO \"live5.db::tables.Tracking\" (\"created\",\"name\",\"value\") VALUES(?,?,?)";
			hdiClient.prepare(sql, function(err, statement) {
				if (err) {
					return console.log("PREPARE ERROR: " + err.toString());
				}
				statement.exec([new Date().toISOString(), "start", track], function(err,
					rows) {
					if (err) {
						return console.log("EXEC ERROR: " + err.toString());
					}
				});
			});
			msg = "Start tracking: " + track;
			console.log(msg);
			res.type("text/html").status(200).send(msg);
			client.stream("statuses/filter", {
				track: track
			}, function(stream) {
				stream.on("data", function(data) {
					if (typeof data.id_str !== "undefined") {
						var myDate = new Date(Date.parse(data.created_at.replace(/( +)/, "UTC$1")));
						var created = myDate.toISOString();
						var replyUser = "";
						if (data.in_reply_to_screen_name !== null) {
							replyUser = data.in_reply_to_screen_name;
						}
						var retweetedUser = "";
						if (typeof data.retweeted_status !== "undefined") {
							retweetedUser = data.retweeted_status.user.screen_name;
						}
						var sql =
							"INSERT INTO \"live5.db::tables.Tweets\" (\"id\",\"created\",\"text\",\"lang\",\"user\",\"replyUser\",\"retweetedUser\") VALUES(?,?,?,?,?,?,?)";
						hdiClient.prepare(sql, function(err, statement) {
							if (err) {
								return console.log("PREPARE ERROR: " + err.toString());
							}
							statement.exec([data.id_str, created, data.text, data.lang, data.user.screen_name, replyUser, retweetedUser], function(err,
								rows) {
								if (err) {
									return console.log("EXEC ERROR: " + err.toString());
								} else {
									console.log("EXEC OK: ", data.id_str, created, rows);
								}
							});
						});
					}
				});
				client.currentTwitterStream = stream;
			});
		} else {
			msg = "Nothing to track";
			console.log(msg);
			res.type("text/html").status(200).send(msg);
		}
	});

	app.get("/stop", function(req, res) {
		var hdiClient = req.db;
		if (typeof client.currentTwitterStream !== "undefined") {
			var sql = "INSERT INTO \"live5.db::tables.Tracking\" (\"created\",\"name\") VALUES(?,?)";
			hdiClient.prepare(sql, function(err, statement) {
				if (err) {
					return console.log("PREPARE ERROR: " + err.toString());
				}
				statement.exec([new Date().toISOString(), "stop"], function(err,
					rows) {
					if (err) {
						return console.log("EXEC ERROR: " + err.toString());
					}
				});
			});
			msg = "Stop";
			console.log(msg);
			res.type("text/html").status(200).send(msg);
			client.currentTwitterStream.destroy();
		} else {
			msg = "Nothing to stop";
			console.log(msg);
			res.type("text/html").status(200).send(msg);
		}
	});

	return app;
};
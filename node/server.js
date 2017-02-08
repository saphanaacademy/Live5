/*eslint no-console: 0, no-unused-vars: 0, no-undef:0*/
"use strict";

var xsenv = require("sap-xsenv");
var passport = require("passport");
var xssec = require("sap-xssec");
var xsHDBConn = require("sap-hdbext");
var express = require("express");
var logging = require("sap-logging");
var async = require("async");

var port = process.env.PORT || 3000;
var server = require("http").createServer();
var appContext = logging.createAppContext();
var app = express();

passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		tag: "xsuaa"
	}
}).uaa));

app.use(logging.expressMiddleware(appContext));
app.use(passport.initialize());

var hanaOptions = xsenv.getServices({
	hana: {
		tag: "hana"
	}
});

app.use(
	passport.authenticate("JWT", {
		session: false
	}),
	xsHDBConn.middleware(hanaOptions.hana)
);

var router = require("./router")(app, server);

server.on("request", app);
server.listen(port, function() {
	console.info("HTTP Server listening on port: " + server.address().port);
});
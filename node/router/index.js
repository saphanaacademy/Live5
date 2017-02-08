"use strict";

module.exports = function(app, server) {
	app.use("/node/twitter", require("./routes/twitter")(server));
};
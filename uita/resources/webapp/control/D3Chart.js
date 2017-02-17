jQuery.sap.require("sap.ui.thirdparty.d3");
jQuery.sap.includeScript("https://rawgit.com/jasondavies/d3-cloud/master/build/d3.layout.cloud.js");
sap.ui.define([
	"sap/ui/core/Control"
], function(Control) {
	"use strict";
	return Control.extend("live5.uita.control.D3Chart", {
		metadata: {
			properties: {
				type: {
					type: "string",
					defaultValue: ""
				},
				sentiment: {
					type: "boolean",
					defaultValue: true
				},
				maxPieValues: {
					type: "int",
					defaultValue: 10
				},
				maxCloudValues: {
					type: "int",
					defaultValue: 100
				}
			}
		},

		init: function() {},

		setType: function(sValue) {
			this.setProperty("type", sValue, true);
		},

		setSentiment: function(bValue) {
			this.setProperty("sentiment", bValue, true);
		},

		setMaxPieValues: function(iValue) {
			this.setProperty("maxPieValues", iValue, true);
		},

		setMaxCloudValues: function(iValue) {
			this.setProperty("maxCloudValues", iValue, true);
		},

		getType: function() {
			return this.getProperty("type");
		},

		getSentiment: function() {
			return this.getProperty("sentiment");
		},

		getMaxPieValues: function() {
			return this.getProperty("maxPieValues");
		},

		getMaxCloudValues: function() {
			return this.getProperty("maxCloudValues");
		},

		renderer: function(oRM, oControl) {
			oRM.write("<div");
			oRM.writeControlData(oControl);
			oRM.addClass("D3Chart");
			oRM.writeClasses();
			oRM.write(">");
			oRM.write("<svg id=\"" + oControl.getId() + "-d3\" width=\"100%\" height=\"600px\"></svg>");
			oRM.write("</div>");
		},

		onAfterRendering: function() {
			this.doRefresh();
			var this2 = this;
			sap.ui.Device.resize.attachHandler(function() {
				this2.doRefresh();
			});
		},

		drawPie: function(data) {

			var this2 = this;

			var oParentControl = this.getParent().$(); // Retrieve jQuery object from parent control.
			var width = oParentControl.width();
			var height = oParentControl.height() - 200;

			var radius = Math.min(width, height) / 2;

			d3.selectAll("svg > *").remove();

			var svg = d3.select("#" + this.getId() + "-d3")
				.append("g")
				.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

			svg.append("g")
				.attr("class", "slices");
			svg.append("g")
				.attr("class", "labels");
			svg.append("g")
				.attr("class", "lines");

			var pie = d3.layout.pie()
				.sort(null)
				.value(function(d) {
					return d.count;
				});

			var arc = d3.svg.arc()
				.outerRadius(radius * 0.8)
				.innerRadius(radius * 0.4);

			var outerArc = d3.svg.arc()
				.innerRadius(radius * 0.9)
				.outerRadius(radius * 0.9);

			var key = function(d) {
				return d.data.type;
			};

			var colorRange = d3.scale.category20();
			var color = d3.scale.ordinal()
				.range(colorRange.range());

			// ------- PIE SLICES -------
			var slice = svg.select(".slices").selectAll("path.slice")
				.data(pie(data), key);

			slice.enter()
				.insert("path")
				.style("fill", function(d) {
					return color(d.data.type);
				})
				.attr("class", "slice")
				.on("mouseover", function(g2) {
					if (g2.data.type !== "Other...") {
						d3.select(this).style("cursor", "pointer");
					}
				})
				.on("mouseout", function() {
					d3.select(this).style("cursor", "default");
				})
				.on("click", function(g2) {
					if (g2.data.type !== "Other...") {
						d3.select(this).style("cursor", "wait");
						this2.setType(g2.data.type);
						this2.doRefresh();
					}
				});

			slice
				.transition().duration(1000)
				.attrTween("d", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						return arc(interpolate(t));
					};
				});

			slice.exit()
				.remove();

			// ------- TEXT LABELS -------
			var text = svg.select(".labels").selectAll("text")
				.data(pie(data), key);

			text.enter()
				.append("text")
				.attr("dy", ".35em")
				.text(function(d) {
					return d.data.type + " " + d.data.PCT + "%";
				});

			function midAngle(d) {
				return d.startAngle + (d.endAngle - d.startAngle) / 2;
			}

			text.transition().duration(1000)
				.attrTween("transform", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						var pos = outerArc.centroid(d2);
						pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
						return "translate(" + pos + ")";
					};
				})
				.styleTween("text-anchor", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						return midAngle(d2) < Math.PI ? "start" : "end";
					};
				});

			text.exit()
				.remove();

			// ------- SLICE TO TEXT POLYLINES -------
			var polyline = svg.select(".lines").selectAll("polyline")
				.data(pie(data), key);

			polyline.enter()
				.append("polyline");

			polyline.transition().duration(1000)
				.attrTween("points", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						var pos = outerArc.centroid(d2);
						pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
						return [arc.centroid(d2), outerArc.centroid(d2), pos];
					};
				});

			polyline.exit()
				.remove();

		},

		drawWordCloud: function(data) {

			var this2 = this;

			//Based on http://bl.ocks.org/jwhitfieldseed/9697914			
			//Simple animated example of d3-cloud - https://github.com/jasondavies/d3-cloud
			//Based on https://github.com/jasondavies/d3-cloud/blob/master/examples/simple.html

			var oParentControl = this.getParent().$(); // Retrieve jQuery object from parent control.
			var width = oParentControl.width();
			var height = oParentControl.height() - 200;

			d3.selectAll("svg > *").remove();

			var svg = d3.select("#" + this.getId() + "-d3")
				.append("g")
				.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

			var fill = d3.scale.category20();

			d3.layout.cloud().size([width, height])
				.words(data)
				.padding(5)
				.rotate(function() {
					return ~~(Math.random() * 2) * 90;
				})
				.font("Impact")
				.fontSize(function(d) {
					return d.size;
				})
				.on("end", function(d) {

					var cloud = svg.selectAll("g text")
						.data(data, function(d) {
							return d.text;
						});

					cloud.enter()
						.append("text")
						.style("font-family", "Impact")
						.style("fill", function(d, i) {
							return fill(i);
						})
						.attr("text-anchor", "middle")
						.attr("font-size", 1)
						.text(function(d) {
							return d.text;
						});

					cloud
						.transition()
						.duration(600)
						.style("font-size", function(d) {
							return d.size + "px";
						})
						.attr("transform", function(d) {
							return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
						})
						.style("fill-opacity", 1);

					cloud.exit()
						.transition()
						.duration(200)
						.style("fill-opacity", 1e-6)
						.attr("font-size", 1)
						.remove();

				})
				.start();

			svg.append("text")
				.attr("x", 0)
				.attr("y", 0 - (height / 2.2))
				.attr("text-anchor", "middle")
				.style("font-size", "20px")
				.text(this2.getType())
				.on("mouseover", function() {
					d3.select(this).style("cursor", "pointer");
				})
				.on("mouseout", function() {
					d3.select(this).style("cursor", "default");
				})
				.on("click", function() {
					d3.select(this).style("cursor", "wait");
					this2.setType("");
					this2.doRefresh();
				});
		},

		doRefresh: function() {

			var this2 = this;

			// prepare OData query
			var url = "/services.xsodata/textAnalysis?$orderby=count desc&$select=";
			if (this.getType() !== "") {
				url += "token,count&$filter=type eq '" + this.getType() + "'&$top=" + this.getMaxCloudValues();
			} else {
				url += "type,count";
				if (this.getSentiment()) {
					url +=
						"&$filter=type eq 'StrongNegativeSentiment'or type eq 'WeakNegativeSentiment' or type eq 'StrongPositiveSentiment'or type eq 'WeakPositiveSentiment' or type eq 'NeutralSentiment'";
				}
			}

			$.ajax({
				url: url,
				type: "get",
				error: function() {
					sap.m.MessageToast.show("D3Chart refresh data error");
				},
				success: function(data1) {

					// reduce to max # displayed values as needed (only relevant to pie)
					var data = [];
					var index;
					var otherCount = 0;
					for (index = 0; index < data1.d.results.length; ++index) {
						if (index <= this2.getMaxPieValues() - 2 || this2.getType() !== "") {
							data.push(data1.d.results[index]);
						} else {
							otherCount += data1.d.results[index].count;
						}
					}
					if (otherCount > 0) {
						var otherText = "Other...";
						data.push({
							"type": otherText,
							"count": otherCount
						});
					}

					// get %
					var total = 0;
					$.each(data, function() {
						total += this.count;
					});
					$.each(data, function() {
						this.PCT = ((this.count / total) * 100).toFixed(1);
						if (this2.getType() !== "") {
							this.text = this.token;
							this.size = (this.PCT * 0.8) + 20; // ensure values fall between 20 and 100 as size refers to font size!
						}
					});

					// draw chart
					if (this2.getType() !== "") {
						this2.drawWordCloud(data);
					} else {
						this2.drawPie(data);
					}

				}
			});
		}
	});
});
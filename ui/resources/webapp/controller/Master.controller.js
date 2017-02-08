
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			...
			this.showTweets();
			this.showTracking();
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		onStartPress: function() {
			if (!this._oStartDialog) {
				this._oStartDialog = sap.ui.xmlfragment("live5.ui.view.StartDialog", this);
				this.getView().addDependent(this._oStartDialog);
				this._oStartDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
				sap.ui.getCore().byId("track").setValue(this.byId("trackingLabel").getText().split(": ")[1]);
			}
			this._oStartDialog.open();
		},

		onCloseStartDialog: function(oEvent) {
			var track = encodeURI(sap.ui.getCore().byId("track").getValue());
			if (oEvent.getSource().getId() === "ok" && track !== "") {
				$.ajax({
					url: "/node/twitter/start",
					type: "get",
					async: true,
					data: {
						track: track
					},
					error: function() {
						sap.m.MessageToast.show("Tracking start error");
					},
					success: function() {
						sap.m.MessageToast.show("Tracking started");
					}
				});
			}
			this._oStartDialog.close();
			this.showTracking();
		},

		onStopPress: function() {
			$.ajax({
				url: "/node/twitter/stop",
				type: "get",
				error: function() {
					sap.m.MessageToast.show("Tracking stop error");
				},
				success: function() {
					sap.m.MessageToast.show("Tracking stopped");
				}
			});
		},

		onClusterPress: function() {
			var this2 = this;
			$.ajax({
				url: "/index.xsjs?cmd=cluster",
				type: "get",
				async: "false",
				error: function() {},
				success: function() {
					this2.onRefresh();
				}
			});
		},

		onResetPress: function() {
			var this2 = this;
			$.ajax({
				url: "/index.xsjs?cmd=reset",
				type: "get",
				async: "false",
				error: function() {},
				success: function() {
					this2.onRefresh();
				}
			});
		},

		onSHAPress: function() {
			window.open("https://www.youtube.com/user/saphanaacademy", "_blank");
		},

		showTweets: function() {
			$.ajax({
				url: "/services.xsodata/Tweets/$count",
				type: "get",
				error: function() {},
				success: function(data) {
					sap.m.MessageToast.show(data + " tweets");
				}
			});
		},

		showTracking: function() {
			var this2 = this;
			$.ajax({
				url: "/services.xsodata/Tracking?$filter=name%20eq%20%27start%27&$top=1&$orderby=created%20desc",
				type: "get",
				error: function() {},
				success: function(data) {
					this2.byId("trackingLabel").setText("Tracking: " + data.d.results[0].value);
				}
			});
		},


		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			...
			this.showTweets();
			this.showTracking();
		},

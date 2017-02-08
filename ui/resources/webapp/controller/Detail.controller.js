
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		onTitlePress: function(evt) {
			this.getRouter().navTo("user", {
				objectId: this.getView().getBindingContext().getProperty("clusterNumber"),
				user: evt.getSource().getTitle().split(" ")[0].substring(1)
			}, true);
		},

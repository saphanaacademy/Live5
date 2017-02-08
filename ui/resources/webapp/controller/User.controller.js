sap.ui.define([
	"live5/ui/controller/BaseController",
	"sap/ui/core/routing/History"
], function(BaseController, History) {
	"use strict";

	return BaseController.extend("live5.ui.controller.User", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the add controller is instantiated.
		 * @public
		 */
		onInit: function() {

			// Register to the add route matched
			this.getRouter().getRoute("user").attachPatternMatched(this._onRouteMatched, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		_onRouteMatched: function() {
			//this.byId("formPanel").setHeaderText("Neighborhood for @" + this.getRouter()._oRouter._prevMatchedRequest.split("/")[3]);
			this.onRefresh();
		},
		
		onRefresh: function() {
			var user = this.getRouter()._oRouter._prevMatchedRequest.split("/")[3];
			var modelData = {};
			$.ajax({
				url: "/index.xsjs?cmd=neighborhood&user=" + user + "&direction=" + this.byId("radioDirection").getSelectedButton().getText().toLowerCase() + "&min=" + this.byId("sliderMin").getValue() + "&max=" + this.byId("sliderMax").getValue(),
				type: "get",
				async: false,
				error: function() {
					sap.m.MessageToast.show("Neighborhood refresh data error");
				},
				success: function(data) {
					modelData.users = JSON.parse(data);
				}
			});
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData(modelData);
			var oTable = this.byId("userNeighborhoodList");
			oTable.setModel(oModel);
			this.byId("pullToRefresh").hide();
		},

		/**
		 * Event handler for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack : function() {

			var oHistory = History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Otherwise we go backwards with a forward history
				var bReplace = true;
				this.getRouter().navTo("object", {objectId: this.getRouter()._oRouter._prevMatchedRequest.split("/")[1]}, bReplace);
			}
	}

	});
});

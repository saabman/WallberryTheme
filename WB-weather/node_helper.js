const NodeHelper = require('node_helper');
var request = require('request');
const fetch = require('node-fetch');
var moment = require('moment');

module.exports = NodeHelper.create({
  start: function() {
    this.config = null;
	},

	fetchData: function() {
    if (this.config === null) {
      return
    }

    let wurl = 'http://www.bom.gov.au/fwo/IDN60801/'+ this.config.stationId +'.json';

request({
			url: wurl,
			headers: {'user-agent': 'node.js'},
			method: 'GET'
		}, (error, response, body) => {
      if (error) {
        this.sendSocketNotification("NETWORK_ERROR", error);
      } else {
        this.sendSocketNotification("DATA_AVAILABLE", response);
      }
		});
	},

	socketNotificationReceived: function(notification, payload) {
    switch(notification) {
      case "SET_CONFIG":
      this.config = payload;
      break;

      case "FETCH_DATA":
      this.fetchData();
      break;
    }
	}
});

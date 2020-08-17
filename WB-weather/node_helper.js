const NodeHelper = require('node_helper');
var request = require('request');
const fetch = require('node-fetch');
var moment = require('moment');
const ftp = require("basic-ftp");
const xml2js = require('xml2js');
const fs = require('fs');

module.exports = NodeHelper.create({
  start: function() {
    this.config = null;
	},

	fetchData: function() {
    if (this.config === null) {
      return
    }

    let wurl = 'http://www.bom.gov.au/fwo/IDN60801/IDN60801.95716.json';

    let furl = 'ftp://ftp.bom.gov.au/anon/gen/fwo/IDN11107.xml';
    console.log(wurl);

example()
async function example() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access({
          host: "ftp.bom.gov.au"
        })
        console.log(await client.list())
        await client.downloadTo("weatherdata.xml", "/anon/gen/fwo/IDN11107.xml")
    }
    catch(err) {
        console.log(err)
    }
    client.close()
}
const xml = fs.readFileSync("weatherdata.xml");
xml2js.parseString(xml, {mergeAttrs: true}, (err, result) => {
    if (err) {
          throw err;

    }
    const json = JSON.stringify(result, null, 4);
    this.sendSocketNotification("forecastAvailable", json);
    //console.log(json);
    fs.writeFileSync('weatherdata.json',json);
});


request({
			url: wurl,
			headers: {'user-agent': 'node.js'},
			method: 'GET'
		}, (error, response, body) => {
      if (error) {
        this.sendSocketNotification("NETWORK_ERROR", error);
      } else {
        this.sendSocketNotification("DATA_AVAILABLE", response);
        //this.sendSocketNotification("forecastAvailable", json);
        console.log(json);
      }
		});
	},

	socketNotificationReceived: function(notification, payload) {
    switch(notification) {
      case "SET_CONFIG":
      this.config = payload;
      break;

      case "FETCH_DATA":
      //this.example();
      this.fetchData();
      break;
    }
	}
});

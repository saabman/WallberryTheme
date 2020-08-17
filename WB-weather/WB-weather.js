/* Magic Mirror - WallberryTheme <3
 * Module: WB-weather
 *
 * By JSC (@delightedCrow)
 * Modified by Bernie for use withe BOM.gov.au 2020
 * MIT Licensed.
 */
Module.register("WB-weather", {
	// Module config defaults.
	defaults: {
		daysToForecast: 5, // how many days to include in upcoming forecast

    updateInterval: 10 * 60 * 1000, // 10 minutes
    initialLoadDelay: 1000,
    retryDelay: 2500
	},

	fetchTimer: null,

	wdata: {
		maxForecastPossible: 8, // DarkSky only allows for up to 8 days
		fetchError: null,
		fetchResponse: null,
	},

	precipIcons: { // icons for displaying type of precipitation
		"default": "wi-raindrop",
		"12": "wi-raindrop",
		"snow": "wi-snowflake-cold"
	},

	// Map icons from BOM - This list may need adjusting depending on what BOM
	// gives us over time.
	convertForecastType(forecastType) {
		const forecastTypes = {
					"1":"day-sunny",
					"2": "night-clear",
					"3": "day-sunny-overcast",
					"4": "day-cloudy",
					"6": "day-haze",
					"8":"rain-mix",
					"9":"windy",
					"10":"day-fog",
					"11":"day-showers",
					"12":"day-rain",
					"13":"dust",
					"14":"snowflake-cold",
					"15":"snow",
					"16":"thunderstorm",
					"17":"day-showers",
					"18":"day-rain",
					"19":"hurricane"
				};
		return forecastTypes.hasOwnProperty(forecastType) ? forecastTypes[forecastType] : null;
	},
	convertWeatherType(weatherType) {
		const weatherTypes = {
					"-": "clear",
					"Clear": "clear",
					"Cloudy": "cloudy",
					"Partly cloudy": "partly-cloudy"
				};
		return weatherTypes.hasOwnProperty(weatherType) ? weatherTypes[weatherType] : null;
	},

	translationKey: {
		loading: "WLOADING",
		invalidKey: "API_KEY_MISSING",
		today: "TODAY",
		connectionError: "CONNECTION_ERROR",
		error: "ERROR"
	},

	getTranslations: function() {
		return {
			en: "translations/en.json"
		}
	},

	getScripts: function() {
		return ["moment.js"]
	},

	getStyles: function() {
		return ["weather-icons.css", "WB-weather.css"]
	},

	getTemplate: function() {
		return "WB-weather.njk"
	},

	getTemplateData: function() {
		return {
			config: this.config,
			weather: this.getWeatherDataForTemplate(),
			status: this.getStatusDataForTemplate()
		};
	},

	start: function() {
		Log.info("Starting module: " + this.name);
			this.sendSocketNotification("SET_CONFIG", this.config);
			this.scheduleUpdate(this.config.initialLoadDelay);
		//}
	},

	suspend: function() {
		Log.info("Suspending WB-weather...");
		clearTimeout(this.fetchTimer);
	},

	resume: function() {
		this.start();
	},

	scheduleUpdate: function(delay=null) {
		var nextFetch = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextFetch = delay;
		}
		this.fetchTimer = setTimeout(() => {this.sendSocketNotification("FETCH_DATA")}, nextFetch);
	},

	socketNotificationReceived: function(notification, currentWeather) {

		switch(notification) {
			case "NETWORK_ERROR":
				// this is likely due to connection issue - we should retry in a bit
				Log.error("Error reaching BOM Current Weather: ", currentWeather);
				this.wdata.fetchError = currentWeather;
				this.scheduleUpdate();
				break;

			case "DATA_AVAILABLE":
				console.log(currentWeather.statusCode);
				// code 200 means all went well - we have weather data
				if (currentWeather.statusCode == 200) {
					this.scheduleUpdate();
					console.log("code 200",currentWeather);
				} else {
					// if we get anything other than a 200 from BOM it's probably a config error or something else the user will have to restart MagicMirror to address - we shouldn't schedule anymore updates
					Log.error("BOM Error: ", currentWeather);
				}
				this.wdata.fetchResponse = currentWeather;
				break;

				case "forecastAvailable":
					//console.log("forcast available",currentWeather);
					this.wdata.fetchForecast = currentWeather;
	//				console.log(this.wdata.fetchForecast);
					break;

		}

		this.updateDom();
	},

	// this handles getting the translated error/loading messages for the template
	getStatusDataForTemplate: function() {
		var status = {}
		// if fetchResponse is null then we haven't gotten data yet - we're still loading (unless we have an empty API key - then we'll never load anything!)
		if (!this.wdata.fetchResponse) {
			status.loadingMessage = this.translate(this.translationKey.loading);
			console.log (status);
			return status;
		}

		// DarkSky status code of 403 or a missing API key results in INVALID KEY error
		if (this.wdata.fetchResponse.status == 403) {
			status.error = this.translate(this.translationKey.invalidKey);
			return status;
		}

		// DarkSky sent us an error of some kind, probably user supplied an incorrect config parameter
		if (this.wdata.fetchResponse.status != 200) {
			//console.log(this.wdata.fetchResponse.body);
			let errorObj = JSON.parse(this.wdata.fetchResponse.body);
			status.error = this.translate(this.translationKey.error) + errorObj.error;
			return status;
		}

		// Looks like we got a network error
		if (this.wdata.fetchError != null) {
			status.error = this.translate(this.translationKey.connectionError);
			return status;
		}
	},

	// handles processing all the weather data for the template
	getWeatherDataForTemplate: function() {
		// if we don't have weather data we can just return now
		if (this.wdata.fetchResponse == null || this.wdata.fetchResponse.statusCode != 200) {
			return null;
		}

		let bom = JSON.parse(this.wdata.fetchResponse.body);
		let bomForecast = JSON.parse(this.wdata.fetchForecast);
		console.log(bomForecast);
		var weather = {};
    weather.forecast = [];

// gets the BOM air temp, cloud cover discription and the apparent temp.

    weather.currentTemp = (bom.observations.data[0].air_temp);
		//weather.currentDescription = bom.observations.data[0].cloud;
		currentDescription = bom.observations.data[0].cloud;
		console.log(currentDescription);
		weather.feelsLike = ("Feels Like "+ bom.observations.data[0].apparent_t);

// The best BOM gives us for info for a weather icon is the cloud field which
// doesnt distinguish between day and night. To get around this we get the
// current time of day and if its after 18:00 or before 06:00 we call that
// night, otherwise its day.

		var date = new Date();
		var timeOfDay = ('day')
		var now = date.getHours();
		console.log(now);
		if (now > 18||now < 6) {
			timeOfDay = ('night')
			}
			else{timeOfDay = ('day')
			}
			console.log(timeOfDay);



		currentIcont = this.convertWeatherType(currentDescription);
		console.log (currentIcont);
		if (currentIcont == 'cloudy'){
			weather.currentIcon = (currentIcont)
		}
		else {
		weather.currentIcon = (currentIcont) + '-'+ (timeOfDay)
		}

		console.log('weather Icon ' + weather.currentIcon);


// THis section takes the Forecast Information and picks out the bits to display
		for (var i=1; i<this.config.daysToForecast; i++) {  //the number of days the forcast runs for
			var day = {};

			let forecast = bomForecast.product.forecast[0].area[1]["forecast-period"][i];

		day.highTemp = Math.round(forecast.element[3]["_"]);

		day.lowTemp = Math.round(forecast.element[2]["_"]);
		day.precipProbability = (forecast.text[2]["_"]);
		day.precipType = forecast.hasOwnProperty("precipType") ? this.precipIcons[forecast.precipType] : this.precipIcons["default"];
		day.icon = this.convertForecastType(forecast.element[0]["_"]);

		//day.icon = forecast.element[0]["_"];
			console.log("icon "+ day.icon)
			//var date = forecast["start-time-local"][0];
			var date = new Date(forecast["start-time-local"][0]); // not sure about the x1000 here
			console.log(date);
			day.dayLabel = moment.weekdaysShort(date.getDay());

			// changing the day label to "today" instead of day of the week
			if (i === 0) {
				day.dayLabel = this.translate(this.translationKey.today);
						}
			weather.forecast.push(day);
		}
		console.log(weather);
		return weather;
	}
	});

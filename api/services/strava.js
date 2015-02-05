var moment = require('moment');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

var today = moment().format('X');
var firstDayThisYear = moment().startOf('year').format('X');
var lastYearToday = moment().subtract(1, 'years').format('X');
var firstDayLastYear = moment().subtract(1, 'years').startOf('year').format('X');

module.exports = {

  getProgress: function () {
    // TODO: not working (not merging lastYearProgress). guessing because lastYearProgress is a promise
    // want end result to be something like: progress: { thisYear: 180, lastYear: 200 }
    //return thisYearProgress().then(_.partialRight(_.merge, lastYearProgress));
    return thisYearProgress()
  }

};

function thisYearProgress() {
  var options = {
    url: sails.config.globals.urls.strava,
    qs: {
      access_token: sails.config.stravaToken,
      before: today,
      after: firstDayThisYear,
      per_page: 200
    },
    useQuerystring: true
  };
  // TODO: get and return mileage

  return request(options).get(1).then(JSON.parse).then(getMileage);
}

function lastYearProgress() {
  var options = {
    url: sails.config.globals.urls.strava,
    qs: {
      access_token: sails.config.stravaToken,
      before: lastYearToday,
      after: firstDayLastYear,
      per_page: 200
    },
    useQuerystring: true
  };
  // TODO: get and return mileage
  return request(options).get(1).then(JSON.parse);
}

function getMileage(results) {

  // miles
  var distances = _.pluck(results, 'distance');
  var meters = _.reduce(distances, function(sum, num) {
    return sum + num
  });
  var rawMiles = Math.ceil(meters / 1609.34);
  var miles = (meters > 0) ? numberWithCommas(rawMiles) : 0;

  return miles;
}

/*

 #!/usr/bin/env node

 // Drag-n-drop a Shell geeklet onto your desktop
 // Execute this script by adding Command to Geeklet
 // pathToNode/node pathToThisScript/strava.js
 // E.g., /usr/local/Cellar/node/0.10.22/bin/node /Users/me/Code/github/Geeklets/strava.js

 var request = require('request');
 var _ = require('lodash-node');
 var moment = require('moment');
 var ping = require('ping');


 // TODO: YOU MUST ENTER YOUR OWN ACCESS TOKEN
 var STRAVA_ACCESS_TOKEN = '5ed81758552a783e5e91476c33b5ee5786cfc10c';

 if (!STRAVA_ACCESS_TOKEN) {
 console.log('\n\n== Strava Access Token ==\n');
 console.log('Please provide a Strava Access Token. Yes, I know I should update this to use OAuth.\n');
 process.exit(1);
 }


 var proxy = 'http://proxy-chain.intel.com:911';

 var options = {
 url: 'https://www.strava.com/api/v3/activities?access_token=' + STRAVA_ACCESS_TOKEN + '&per_page=200&after=1388563200',
 };
 var retObj = {};
 var content = '2014 STRAVA DATA\r';
 //content += '–––––––——–––––––––––––––––––––\r';

 var init = function() {

 // check if we have external URL access
 ping.sys.probe('google.com', function(isAlive) {
 if (!isAlive) {
 // if not, use proxy to get data
 options.proxy = proxy;
 }
 getData(options);
 });
 };

 var getData = function() {
 request(options, function(error, response, body) {
 if (!error && response.statusCode == 200) {
 processData(body);
 } else {
 // there was an error, try using proxy server
 console.log('Error:: ' + error);
 content = 'Failed. ' + response.statusCode;
 }
 outputContent(retObj);
 });
 };

 var processData = function(body) {

 var results = JSON.parse(body);

 results = _.remove(results, function(item) {
 return item.workout_type !== 3;
 });

 results = _.remove(results, function(item) {
 if (item.start_date) {
 var actYear = moment(item.start_date).year();
 return actYear === 2015;
 }
 });

 // total rides
 // content += 'rides:\t\t' + results.length + '\r';
 retObj.rides = results.length;

 // miles
 var distances = _.pluck(results, 'distance');
 var meters = _.reduce(distances, function(sum, num) {
 return sum + num
 });
 var rawMiles = Math.ceil(meters / 1609.34);
 var miles = (meters > 0) ? numberWithCommas(rawMiles) : 0;
 // content += 'miles:\t\t' + miles + '\r';
 retObj.miles = miles;

 // average miles per day
 var day = moment().dayOfYear();
 var avg = rawMiles / day;
 // content += 'avg/day:\t' + Math.round(avg * 10) / 10 + '\r';
 retObj.dailyAverage = Math.round(avg * 10) / 10;

 // percentage riding days
 var ridePercentage = results.length / day;
 var daysRidden = Math.floor(ridePercentage * 100);
 // content += '% days:\t ' + daysRidden + '%\r';
 retObj.percentageOfDays = daysRidden;

 // climbing
 var climbing = _.pluck(results, 'total_elevation_gain');
 var climbingMeters = _.reduce(climbing, function(sum, num) {
 return sum + num
 });
 var climbingFeet = (climbingMeters > 0) ? numberWithCommas(Math.ceil(climbingMeters / 0.3048)) : 0;
 // content += 'climbing:\t' + climbingFeet + '\r';
 retObj.climbing = climbingFeet;

 // calories
 var calories = _.pluck(results, 'kilojoules');
 var cals = _.reduce(calories, function(sum, num) {
 return sum + num
 });
 var totalCals = (cals > 0) ? numberWithCommas(Math.ceil(cals)) : 0;
 // content += 'calories:\t' + totalCals + '\r';
 retObj.calories = totalCals;

 // moving time
 var times = _.pluck(results, 'moving_time');
 var time = _.reduce(times, function(sum, num) {
 return sum + num
 });
 var minutes = time / 60;
 var movingTime = (minutes > 0) ? minutesToStr(minutes) : 0;
 // content += 'time:\t\t' + movingTime + '\r';
 retObj.movingTime = movingTime;

 };

 // HELPERS
 var numberWithCommas = function(x) {
 return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 };

 var outputContent = function(data) {
 console.log(JSON.stringify(data));
 };

 var minutesToStr = function(minutes) {
 var sign = '';
 if (minutes < 0) {
 sign = '-';
 }

 var hours = leftPad(Math.floor(Math.abs(minutes) / 60));
 var minutes = leftPad(Math.abs(minutes) % 60);

 return sign + hours + 'hrs ' + Math.floor(minutes) + 'min';

 };

 var leftPad = function(number) {
 return ((number < 10 && number >= 0) ? '0' : '') + number;
 };
 // END HELPERS

 init();


 */

var moment = require('moment');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

var today = moment().format('X');
var firstDayThisYear = moment().startOf('year').format('X');
var lastYearToday = moment().subtract(1, 'years').format('X');
var firstDayLastYear = moment().subtract(1, 'years').startOf('year').format('X');

module.exports = {

  getProgress: function () {

    return Promise.props(
      {
        thisYear: thisYearProgress(),
        lastYear: lastYearProgress()
      }
    );
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

  return request(options)
            .get(1)
            .then(JSON.parse)
            .then(getMileage)
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
  return request(options)
    .get(1)
    .then(JSON.parse)
    .then(getMileage)
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

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

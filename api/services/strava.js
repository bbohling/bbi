var moment = require('moment');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

module.exports = {

    getProgress: function(user) {

        var options = {
            url: sails.config.globals.urls.strava,
            qs: {
                access_token: sails.config.stravaToken,
                per_page: 200
            },
            useQuerystring: true
        };

        var user = user || 'bb';

        switch (user) {
          case 'db':
            options.qs.access_token = sails.config.dbStravaToken;
            break;
          default:
            options.qs.access_token = sails.config.stravaToken;
            break;
        }

        var today = moment().format('X');
        var firstDayThisYear = moment().startOf('year').format('X');
        var lastYearToday = moment().subtract(1, 'years').format('X');
        var firstDayLastYear = moment().subtract(1, 'years').startOf('year').format('X');

        return Promise.props({
            thisYear: thisYearProgress(options, today, firstDayThisYear),
            lastYear: lastYearProgress(options, lastYearToday, firstDayLastYear)
        });
    }

};

function thisYearProgress(options, today, firstDayThisYear) {
    options.qs.before = today;
    options.qs.after = firstDayThisYear;
    return request(options)
        .get(1)
        .then(JSON.parse)
        .then(processData)
}

function lastYearProgress(options, lastYearToday, firstDayLastYear) {
    options.qs.before = lastYearToday;
    options.qs.after = firstDayLastYear;
    return request(options)
        .get(1)
        .then(JSON.parse)
        .then(processData)
}

function processData(results) {
    // only keep ride data
    results = _.remove(results, function(item) {
        return item.workout_type !== 3;
    });

    var data = {

    };

    // total rides
    data.rides = results.length;

    // miles
    var distances = _.pluck(results, 'distance');
    var meters = _.reduce(distances, function(sum, num) {
        return sum + num
    });
    var rawMiles = Math.ceil(meters / 1609.34);
    // data.miles = (meters > 0) ? numberWithCommas(rawMiles) : 0;
    data.miles = (meters > 0) ? rawMiles : 0;

    // ride average
    data.rideAverage = Math.round((rawMiles / data.rides) * 10) / 10;

    // average miles per day
    var day = moment().dayOfYear();
    var avg = rawMiles / day;
    data.dailyAverage = Math.round(avg * 10) / 10;

    // percentage riding days
    var ridePercentage = results.length / day;
    data.percentageOfDays = Math.floor(ridePercentage * 100);

    // climbing
    var climbing = _.pluck(results, 'total_elevation_gain');
    var climbingMeters = _.reduce(climbing, function(sum, num) {
        return sum + num
    });
    //var climbingFeet = (climbingMeters > 0) ? numberWithCommas(Math.ceil(climbingMeters / 0.3048)) : 0;
    var climbingFeet = (climbingMeters > 0) ? Math.ceil(climbingMeters / 0.3048) : 0;
    data.climbing = climbingFeet;

    // calories
    var calories = _.pluck(results, 'kilojoules');
    var cals = _.reduce(calories, function(sum, num) {
        return sum + num
    });
    // data.calories = (cals > 0) ? numberWithCommas(Math.ceil(cals)) : 0;
    data.calories = (cals > 0) ? Math.ceil(cals) : 0;

    // average calories 
    data.caloriesAverage = Math.ceil(data.calories/data.rides);

    // moving time
    var times = _.pluck(results, 'moving_time');
    var time = _.reduce(times, function(sum, num) {
        return sum + num
    });
    var minutes = time / 60;
    // data.movingTime = (minutes > 0) ? minutesToStr(minutes) : 0;
    data.movingTimeMinutes = (minutes > 0) ? Math.ceil(minutes) : 0;

    return data;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function minutesToStr(minutes) {
    var sign = '';
    if (minutes < 0) {
        sign = '-';
    }

    var hours = leftPad(Math.floor(Math.abs(minutes) / 60));
    var minutes = leftPad(Math.abs(minutes) % 60);

    return sign + hours + 'hrs ' + Math.floor(minutes) + 'min';

}

function leftPad(number) {
    return ((number < 10 && number >= 0) ? '0' : '') + number;
};

/*


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

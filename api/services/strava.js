var moment = require('moment');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

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

var fullReport = true;

module.exports = {

    getProgress: function (user) {
        return Promise.props({
            thisYear: progress(options, today, firstDayThisYear),
            lastYear: progress(options, lastYearToday, firstDayLastYear)
        });
    },
    getTrend: function (user) {
        fullReport = false;
        return Promise.props({
            thisYear: progress(options, today, firstDayThisYear),
            lastYear: progress(options, lastYearToday, firstDayLastYear)
        })
            .then(transformData);
    }

};

function transformData(data) {

    var trendData = {
        graph: {
            title: "Cycling Trends",
            refreshEveryNSeconds: 3600,
            total: false,
            type: "bar",
            xAxis: {
                showEveryLabel: false
            }
        }
    };
    
    var counter = 0;
    // FYI: COLOR OPTIONS
    //      yellow, green, red, purple, blue, mediumGray, pink, aqua, orange, lightGray
    trendData.graph.datasequences = _.map(data, function (val, key) {
        counter++;
        return {
            title: key,
            color: (counter === 1) ? "blue" : "lightGray",
            datapoints: getPoints(val)
        };
    });

    function getPoints(thePoints) {
        return _.map(thePoints, function (itemVal, keyVal) {
            return { title: keyVal, value: itemVal };
        });
    }

    return trendData;

}

function progress(options, today, firstDayOfYear) {
    options.qs.before = today;
    options.qs.after = firstDayOfYear;
    return request(options)
        .get(1)
        .then(JSON.parse)
        .then(processData)
}

function processData(results) {
    // only keep ride data
    results = _.remove(results, function (item) {
        return item.workout_type !== 3;
    });

    var data = {

    };
    
    // gear
    //    var noGear = _.map(results, function(activity) {
    //        if (!activity.gear_id) {
    //            return activity.id;
    //        }
    //    });
    
    //    console.log('gear', noGear);
    
    // total rides
    data.rides = results.length;

    // miles
    var distances = _.pluck(results, 'distance');
    var meters = _.reduce(distances, function (sum, num) {
        return sum + num
    });
    var rawMiles = Math.ceil(meters / 1609.34);
    data.miles = (meters > 0) ? rawMiles : 0;

    if (fullReport) {
        // ride average
        data.rideAverage = Math.round((rawMiles / data.rides) * 10) / 10;

        // average miles per day
        var day = moment().dayOfYear();
        var avg = rawMiles / day;
        data.dailyAverage = Math.round(avg * 10) / 10;

        // percentage riding days
        var ridePercentage = results.length / day;
        data.percentageOfDays = Math.floor(ridePercentage * 100);

    }
    
    // climbing
    var climbing = _.pluck(results, 'total_elevation_gain');
    var climbingMeters = _.reduce(climbing, function (sum, num) {
        return sum + num
    });
    var climbingFeet = (climbingMeters > 0) ? Math.ceil(climbingMeters / 0.3048) : 0;
    data.climbing = climbingFeet;

    // calories
    var calories = _.pluck(results, 'kilojoules');
    var cals = _.reduce(calories, function (sum, num) {
        return sum + num
    });
    data.calories = (cals > 0) ? Math.ceil(cals) : 0;

    if (fullReport) {
        // average calories 
        data.caloriesAverage = Math.ceil(data.calories / data.rides);

        // moving time
        var times = _.pluck(results, 'moving_time');
        var time = _.reduce(times, function (sum, num) {
            return sum + num
        });
        var minutes = time / 60;
        data.movingTimeMinutes = (minutes > 0) ? Math.ceil(minutes) : 0;

    }

    return data;
}

function leftPad(number) {
    return ((number < 10 && number >= 0) ? '0' : '') + number;
};

var moment = require('moment');
var Promise = require("bluebird");
var request = require("request-promise");

var options;
var user;

function setOptions(biker) {

    options = {
        url: sails.config.globals.urls.strava,
        qs: {
            access_token: sails.config.stravaToken,
            per_page: 200
        },
        useQuerystring: true
    };
    
    user = biker || 'bb';

    switch (user) {
        case 'db':
            options.qs.access_token = sails.config.dbStravaToken;
            break;
        default:
            options.qs.access_token = sails.config.stravaToken;
            break;
    }
    
}

var dates = {};

Object.defineProperty(dates, 'today', {
    get: function () { return moment().format('X'); }
});

Object.defineProperty(dates, 'todayDate', {
    get: function () { return moment().format('YYYYMMDD'); }
});

Object.defineProperty(dates, 'firstDayThisYear', {
    get: function () { return moment().startOf('year').format('X'); }
});

Object.defineProperty(dates, 'lastYearToday', {
    get: function () { return moment().subtract(1, 'years').format('X'); }
});

Object.defineProperty(dates, 'firstDayLastYear', {
    get: function () { return moment().subtract(1, 'years').startOf('year').format('X'); }
});

// var today = moment().format('X');
// var todayDate = moment().format('YYYYMMDD');
// var firstDayThisYear = moment().startOf('year').format('X');
// var lastYearToday = moment().subtract(1, 'years').format('X');
// var firstDayLastYear = moment().subtract(1, 'years').startOf('year').format('X');

var fullReport = true;

module.exports = {

    getProgress: function (user) {
        setOptions(user);
        console.log('\n\n------ USER: ', user);
        return Cycling.findOne({ entry: user + '-' + dates.todayDate })
            .then(function (entry) {
                console.log('TODAY DATE: ', dates.todayDate);
                if (entry && entry.progress && entry.progress.lastYear && entry.progress.thisYear) {
                    console.log('-- cache data');
                    return new Promise(function (resolve) {
                        resolve(entry.progress);
                    });
                }
                else {
                    console.log('-- real-time data');
                    return Promise.props({
                        thisYear: progress(options, dates.today, dates.firstDayThisYear),
                        lastYear: progress(options, dates.lastYearToday, dates.firstDayLastYear)
                    });
                }
            })
            .catch(function (err) {
                console.log('>>> ERROR: Getting Progress', err);
            });
    },
    getTrend: function (user) {
        setOptions(user);
        fullReport = false;
        return Promise.props({
            thisYear: progress(options, dates.today, dates.firstDayThisYear),
            lastYear: progress(options, dates.lastYearToday, dates.firstDayLastYear)
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

function progress(options, endDate, startDate) {
    options.qs.before = endDate;
    options.qs.after = startDate;
    var isThisYear;
    endDate === dates.today ? isThisYear = true : isThisYear = false;
//    console.log('>> isThisYear: ', isThisYear);
    console.log('user (progress): ', user);
    return request(options)
        .then(JSON.parse)
        .then(persistData)
        .then(processData)
        .then(function (results) {
            return persistProgress(results, isThisYear);
        });
}

function persistData(results) {
    // persist
    console.log('user (persistData): ', user);
    return Cycling.findOrCreate({ entry: user + '-' + dates.todayDate }, { entry: user + '-' + dates.todayDate, data: results })
        .then(function () {
            return results;
        })
        .catch(function (err) {
            console.log('=== Error persisting data: ', err);
        });

}

function persistProgress(progressData, isThisYear) {
    var progress = {};
    if (isThisYear) {
        progress.thisYear = progressData;
    }
    else {
        progress.lastYear = progressData;
    }
    return new Promise(function (resolve, reject) {
        Cycling.findOne({ entry: user + '-' + dates.todayDate })
            .then(function (entry) {
                if (entry.progress) {
//                    console.log('==HERE==');
//                    console.log('entry.progress = ', entry.progress);
//                    console.log('progress = ', progress);
                    progress = _.merge(entry.progress, progress);
                }
                entry.progress = progress;
                entry.save()
                    .then(function () {
                        resolve(progressData);
                    })
                    .catch(function (err) {
                        console.log('=== Error saving progress: ', err);
                        reject(err);
                    });
            })
            .catch(function (err) {
                console.log('=== Error finding one: ', err);
                reject(err);
            });;
    });
}

function simpleDate(dt) {
  return moment.utc(dt).format('YYYYMMDD');
}

function processData(results) {
    return new Promise(function (resolve) {
        // only keep ride data
        results = _.remove(results, function (item) {
            return item.workout_type !== 3;
        });

        var data = {

        };

        // gear
        var noGear = _.pluck(_.filter(results, function (activity) {
            if (!activity.gear_id) {
                return activity.id;
            }
        }), 'id');

        console.log('gear', noGear);

        // total rides

        // TODO: probably should change this to capture days ridden
        //       sometimes I do multiple trainer rides in a single session
        //       so simply using number of rides is a bit misleading
        data.rides = results.length;

        // days ridden
        var rideDates = _.pluck(results, 'start_date_local');
        var rideNewDates = _.map(rideDates, simpleDate);
//        console.log('ride dates: ', rideNewDates);
        var daysRidden = _.uniq(rideNewDates).length;
        data.daysRidden = daysRidden;



        // miles
        var distances = _.pluck(results, 'distance');
        var meters = _.reduce(distances, function (sum, num) {
            return sum + num
        });
        var rawMiles = Math.ceil(meters / 1609.34);
        data.miles = (meters > 0) ? rawMiles : 0;

        if (fullReport) {
            // ride average
            data.rideAverage = 0;
            if (!isNaN(rawMiles) && data.rides > 0) {
                data.rideAverage = Math.round((rawMiles / data.rides) * 10) / 10;
            }

            // average miles per day
            data.dailyAverage = 0;
            if (!isNaN(rawMiles)) {
                var day = moment().dayOfYear();
                var avg = rawMiles / day;
                data.dailyAverage = Math.round(avg * 10) / 10;
            }


            // percentage riding days
            data.percentageOfDays = 0;
            if (results.length > 0) {
                // var ridePercentage = results.length / day;
                var ridePercentage = daysRidden / day;
                data.percentageOfDays = Math.floor(ridePercentage * 100);
            }

        }

        // climbing
        var climbing = _.pluck(results, 'total_elevation_gain');
        var climbingMeters = _.reduce(climbing, function (sum, num) {
            return sum + num;
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
            data.caloriesAverage = 0;
            if (data.rides > 0) {
                data.caloriesAverage = Math.ceil(data.calories / data.rides);
            }

            // moving time
            var times = _.pluck(results, 'moving_time');
            var time = _.reduce(times, function (sum, num) {
                return sum + num
            });
            var minutes = time / 60;
            data.movingTimeMinutes = (minutes > 0) ? Math.ceil(minutes) : 0;

        }

        resolve(data);
    });
}

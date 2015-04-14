/**
 * CyclingController
 *
 * @description :: Server-side logic for managing cyclings
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  progress: function(req, res) {
  	var name = req.params.name;
    strava.getProgress(name)
      .then(_.bind(res.json, res), _.bind(res.send, res));
  }

};


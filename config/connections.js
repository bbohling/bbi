var local = require('./local');

module.exports.connections = {

    /***************************************************************************
    *                                                                          *
    * Local disk storage for DEVELOPMENT ONLY                                  *
    *                                                                          *
    * Installed by default.                                                    *
    *                                                                          *
    ***************************************************************************/
    localDiskDb: {
        adapter: 'sails-disk',
        filePath: './data/bbi.db'
    },

    /***************************************************************************
    *                                                                          *
    * MongoDB is the leading NoSQL database.                                   *
    * http://en.wikipedia.org/wiki/MongoDB                                     *
    *                                                                          *
    * Run: npm install sails-mongo                                             *
    *                                                                          *
    ***************************************************************************/
    bbiDb: {
        adapter: 'sails-mongo',
        url: local.db
    },


    /***************************************************************************
    *                                                                          *
    * More adapters: https://github.com/balderdashy/sails                      *
    *                                                                          *
    ***************************************************************************/

};

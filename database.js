require('dotenv').config();
const mysql = require('mysql');
const async = require('async');

const PRODUCTION_DB = process.env.PRODUCTION_DB;
const TEST_DB = process.env.TEST_DB;

exports.MODE_TEST = 'mode_test';
exports.MODE_PRODUCTION = 'mode_production';

var state = {
  pool: null,
  mode: null,
}


var connect = function(mode) {
  state.pool = mysql.createPool({
    connectionLimit : 100,
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: mode === exports.MODE_PRODUCTION ? PRODUCTION_DB : TEST_DB,
    multipleStatements: true
  });

  state.mode = mode;
};

var get = function() {
  
  if(!state.pool){
    
    connect(exports.MODE_PRODUCTION);    
  }  
    return state.pool;
};

exports.fixtures = function(data) {
  var pool = state.pool
  if (!pool) return done(new Error('Missing database connection.'));

  var names = Object.keys(data.tables);
  async.each(names, function(name, cb) {
    async.each(data.tables[name], function(row, cb) {
      var keys = Object.keys(row)
        , values = keys.map(function(key) { return "'" + row[key] + "'" })

      pool.query('INSERT INTO ' + name + ' (' + keys.join(',') + ') VALUES (' + values.join(',') + ')', cb)
    }, cb)
  }, done)
};

exports.drop = function(tables, done) {
  var pool = state.pool
  if (!pool) return done(new Error('Missing database connection.'))

  async.each(tables, function(name, cb) {
    pool.query('DELETE * FROM ' + name, cb)
  }, done)
};

exports.executeSelectCommand = function(procedure, done){
 
  var connection  = get();
  connection.getConnection(function(err,connectionObject){         

    if(err){
      console.log(err);
      return done("Error connecting to database");
    }
    connectionObject.query(procedure, function(err, rows){

        connectionObject.release(); 
        if(err){
          console.log(err);
          return done("Database  error: Operation could not be performed");
        }else{

         return done(null,rows);
        }
    });
  });     
}



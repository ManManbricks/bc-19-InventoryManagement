var database = require('./database.js');
const mysql = require('mysql');
var crypto = require('crypto');
var async = require('async');

var getAllRoleDetails = function(parameter){
	 var procedure = 'CALL sp_getUserNameByEmail(' + mysql.escape('ccn2a1@yahoo.com') + ')';
   database.executeSelectCommand(procedure, function(err,rows){
   	console.log(err);
   	console.log(rows);
     var result = rows[0];
     console.log(result.length);
     if(result.length === 1)  
          	 			console.log(result[0].username); 
   });

}

exports.getAssets = function(done){

	var procedure = 'CALL sp_getAssets()';
	database.executeSelectCommand(procedure, function(err, result){
		
		done(err, result);
	});
}
exports.updateUserPassword = function(id, password, done){

	 var saltHash = saltHashPassword(password);
    var procedure = 'CALL sp_updateUserPassword(' + mysql.escape(id) + ',' + mysql.escape(saltHash.passwordHash) + ',' + mysql.escape(saltHash.salt) + ')';
	database.executeSelectCommand(procedure, function(err, result){

		console.log(err);
		console.log(result);
		done(err,result);
	});
}

exports.validateUser = function(username, password, done){
	
	var salt = "";
	async.series([

			function(callback){
                
                database.executeSelectCommand('CALL sp_getSalt(' + mysql.escape(username) + ')', function(err, result){

                	if(err) return done(err, false);

                	if(result[0].length != 1)
    					return done(null, false);

    	  			 salt = result[0][0].passwordsalt;    	  			 
    	  			 callback();
                });

			},

			function(callback){

				var passwordHashed = sha512(password, salt);
				var procedure = 'CALL sp_validateUser(' + mysql.escape(username) + ',' 
				+ mysql.escape(passwordHashed.passwordHash) + ',' + mysql.escape(passwordHashed.salt) + ')';
    			database.executeSelectCommand(procedure, function(err, rows){
    				passwordHashed = "";
        			if(err)
        				return done(err, false);
        			if(rows[0].length != 1)
    					return done(null, false);
    					callback();
    			});
    		}
		], function(err){

		if(err) return done(err);        
        return done(null, true);
	});
	
}

exports.getUserNameByEmail = function(email, done){
    
    var procedure = 'CALL sp_getUserNameByEmail(' + mysql.escape(email) + ')';
	database.executeSelectCommand(procedure, function(err, rows){
                
   		  done(err,rows);
	});
}

exports.getUserRole = function(id, done){

	var procedure = 'CALL sp_getUserRole(' + mysql.escape(id) + ')';
	database.executeSelectCommand(procedure, function(err, rows){

		done(err,rows);
	});
}

exports.getUser = function(username, done){
    
    var procedure = 'CALL sp_getUser(' + mysql.escape(username) + ')';
	database.executeSelectCommand(procedure, function(err, rows){
                
   		  done(err,rows);
	});
}

var genSalt = function(length){

    return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0, length);   /** return required number of characters */
}

var sha512 = function(password, salt){

    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
}

var saltHashPassword = function(userpassword) {
    var salt = genSalt(128); /** Gives us salt of length 16 */
    var passwordData = sha512(userpassword, salt);
    /*console.log('UserPassword = '+userpassword);
    console.log('Passwordhash = '+passwordData.passwordHash);
    console.log(passwordData.passwordHash.length)
    console.log('\nSalt = '+passwordData.salt);*/
    return passwordData;
}




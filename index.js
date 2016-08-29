var express = require('express');

var app = express();
var handlebars = require('express3-handlebars').create({ defaultLayout: 'main'});
var bodyParser = require('body-parser');
var credentials = require('./credentials.js');
var async = require('async');
var catalogaccess = require('./catalogaccess.js');
var SessionStore = require('express-mysql-session');
// set up handlebars view engine
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 3000);
app.set('env', 'test');
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
	store: new SessionStore({
	host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.PRODUCTION_DB
	}), secret: credentials.sessionSecret, resave: false, saveUninitialized: false
}));

//Defining static folder paths
app.use(express.static(__dirname + '/public'));
//app.use(session({secret: 'ssshhhhh',}));
//app.use('/node_modules', express.static(__dirname + '/node_modules'));
//app.use('/style', express.static(__dirname + '/style'));
//app.engine('html', require('ejs').renderFile);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(function(req, res, next){
	// if there's a flash message, transfer
	// it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});

app.use(function(req, res, next){
	
	res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
     next();
});

app.use(function(req, res, next){

	res.locals.logged = req.session.account;
	next();
});

app.get('/changepassword', function(req,res){

	if(req.signedCookies.loginCookie){

        	res.render('changepassword');
      }else{
          
          if(req.session.account)
          	res.render('changepassword');
          else
    	     res.redirect(303, 'login');
     }    
	
});

app.post('/changepassword', function(req,res){

	async.series([

			function(callback){

				if(req.body.currentpassword.length === 0){

					return callback( new Error('Enter current password'));
				}

				if(req.body.currentpassword.length < 6 || req.body.currentpassword.length > 20){

					return callback( new Error('Invalid current password'));
				}

				if(req.body.newpassword.length === 0){

					return callback( new Error('Enter new password'));
				}

				if(req.body.newpassword.length < 6 || req.body.newpassword.length > 20){

					return callback( new Error('New Password must be between 6 - 20 characters') );
               	}

               	if(req.body.newpassword === req.body.confirmnewpassword){

               		return callback( new Error('New password and confirm password field must match'));
               	}
               	console.log(req.session.account.id);
               	catalogaccess.validateUser(req.session.account.username, req.body.currentpassword, function(err, result){

               		 if(err) return callback(err);

               		 if(!result){

          				return callback( new Error('Invalid current password'));
          			}

          			if(req.body.currentpassword === req.body.newpassword){
          				return callback( new Error('Current password too similar to new password'));
          			}

               		 callback();
               	});
			},

			function(callback){

				catalogaccess.updateUserPassword(req.session.account.id, req.body.newpassword, function(err, result){

					if(err) return callback(err);

					callback();
				});
			}
		], function(err){

		if(err){
           
             req.session.flash = {
									type: 'danger',
									intro: 'Change Password Error!!',
									message: err.message,
								};	  	 				
			 }else{

			 	 req.session.flash = {
									type: 'success',
									intro: 'Sucess!!',
									message: 'Password successfully changed',
								};	
					if(req.signedCookies.loginCookie){
							
							res.clearCookie('loginCookie');
					}
					if(req.session.account){

						delete req.session.account;
					}
				}
	});
});
app.post('/login', function(req, res){

	var username = req.body.username.trim().toLowerCase();
	var userid;
	var role;

	async.series([          
          // Get user by username
          function(callback){
               
                if(username.length === 0){

                	return callback( new Error('Enter username or email'));
                }

                if(req.body.password.length === 0){
                    
                	return callback( new Error('Enter password'));
                }

                if(req.body.password.length < 6 || req.body.password.length > 20 ){

                	return callback( new Error('Password must be between 6 - 20 characters') );
                }

          		catalogaccess.getUserNameByEmail(username, function(err, result){

          	 		if(err) return callback(err);

     				if(result[0].length === 1)  
          	 			username = result[0][0].username; 		
          	 		
                	callback();
                });
          },

          function(callback){

          	 catalogaccess.getUser(username, function(err, result){

          	 	if(err) return callback(err);

          	 	if(result[0].length === 0)  
          	 			return callback( new Error('The username or email does not exist'));

          	 	 userid = result[0][0].id;
          	 	callback();
          	 });
          },

          function(callback){

          		catalogaccess.validateUser(username, req.body.password, function(err, result){

          			if(err) return callback(err);
                    
          			if(!result){

          				return callback( new Error('Incorrect username or email and/or password!Please try again!'));
          			}

          			callback();

          		});
          },
              function(callback){

                   catalogaccess.getUserRole(userid, function(err, result){

                   		if(err) return callback(err);

                   		if(result[0].length === 0){

                   			return callback(new Error('Invalid User'));
                   		}

                   		role = result[0][0].name;
                   		callback();
                   });
              },

          function(callback){
              
             res.clearCookie('loginCookie');
          	 var rememberMe = req.body.remember ? true : false;
          	 if(rememberMe){

          	 	res.cookie('loginCookie', username, { signed: true, maxAge : 86400000, httpOnly : true });
          	 }
          	 callback();
          }

		], function(err){

			if(err){
           
             req.session.flash = {
									type: 'danger',
									intro: 'Login Error!!',
									message: err.message,
									name : req.body.username,
								};
										     
					 res.redirect(303, 'login');
							
			 
			}else{
				req.session.account = {
					username: username,
					role: role,
					id: userid
				};
				req.session.save(function(err){

					if(err) console.log('Error in saving session: ' + err);
				});
				
			res.redirect(303, 'admin');

		}
           
		});
});


app.get('/login', function(req, res){  
    
        if(req.signedCookies.loginCookie){

        	res.redirect(303, 'admin');
        }else{

        	if(req.session.account)
        		res.redirect(303, 'admin');
        	else
    	        res.render('login', {pageTestScript: '/qa/tests-about.js'});
    }    
});

app.get('/add/asset', function(req, res){

	res.render('addasset');
});

app.post('/add/asset', function(req, res){

	var code = req.body.code.trim();
	var number = req.body.number.trim();
	var name = req.body.name.trim();
	var description = req.body.description.trim();
	var date = req.body.date.trim();
	var quantity = req.body.quantity.trim();
	async.series([

			function(callback){
                  
                  if( code.length == 0 )
                  	return callback( new Error('Enter serial code'));

                  if( number.length == 0 )
                  	return callback( new Error('Enter serial number'));

                  if( name.length == 0 )
                  	return callback( new Error('Enter asset name'));

                  if( code.length == 0 )
                  	return callback( new Error('Enter serial code'));


			}

		], function(err){

		if(err){
			 req.session.flash = {
									type: 'danger',
									intro: 'Add Asset Error!!',
									message: err.message,
								};
		}else{

			req.session.flash = {
									type: 'success',
									intro: 'Success!!',
									message: 'Record Successfully Added',
								};
		}
	});
});

app.get('/admin', function(req, res){
    
    if(req.signedCookies.loginCookie || req.session.account){

    		catalogaccess.getAssets(function(err, result){

    				if(err) res.send('Data Could not be loaded');
               res.render('admin', {rows : result[0]});
    		});
        	
      }else{         
         
    	     res.redirect(303, 'login');
     }    
});

app.get('/signout', function(req, res){

	if(req.signedCookies.loginCookie){
		res.clearCookie('loginCookie');
	}
	if(req.session.account){

		delete req.session.account;
	}

	res.redirect(303,'login');
});
app.get('/', function(req, res){
    
    if(req.signedCookies.loginCookie){

        	res.render('admin');
        }else{

    	res.render('login', {pageTestScript: '/qa/tests-about.js'});
    }    
});

// custom 404 page - catch all handler (middleware)
app.use(function(req, res, next){

	res.status(404);
	res.render('404');
});

// custom 500 page - error handler (middleware)
app.use(function(err, req, res, next){

	console.error(err.stack);
	res.status(500);
	res.render('500');
});

// Binding express app to port 3000
app.listen(app.get('port'),function(){
    console.log('Express  running @ http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');

});


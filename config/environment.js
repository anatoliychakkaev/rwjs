var mongoStore = require('connect-mongodb');
var express = require('express');

app.settings.db = JSON.parse(require('fs').readFileSync(__dirname + '/database.json', 'utf-8'))[app.settings.env];

var mongoSessionStore = new mongoStore({
    dbname:   app.settings.db.database,
    host:     app.settings.db.host,
    username: app.settings.db.user,
    password: app.settings.db.password
}, function () {});

app.configure(function(){
    app.use(express.static(app.root + '/public'));
    app.set('views', app.root + '/app/views');
    app.set('view engine', 'ejs');
    app.set('defaultLocale', 'en');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', store: mongoSessionStore}));
    app.use(express.methodOverride());
    app.use(app.router);
});


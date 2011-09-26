var express = require('express');

app.configure(function(){
    app.use(express.static(app.root + '/public'));
    app.set('views', app.root + '/app/views');
    app.set('view engine', 'ejs');
    app.set('defaultLocale', 'en');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret'}));
    app.use(express.methodOverride());
    app.use(app.router);
});


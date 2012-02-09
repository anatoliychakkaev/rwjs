var express = require('express');
var fs = require('fs');

require('railway-monitor').init(app, {
    apiKey: '52bd4bb6-0b87-4d59-b46c-7a921b1abbe6',
    host: 'node-js.ru',
    port: 1678
});

app.configure(function(){
    app.use(express.static(app.root + '/public'));
    app.set('views', app.root + '/app/views');
    app.set('view engine', 'ejs');
    app.set('defaultLocale', 'en');
    app.enable('quiet');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret'}));
    app.use(express.methodOverride());
    app.use(app.router);
});


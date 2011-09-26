var express = require('express');

app.configure('production', function () {
    app.enable('view cache');
    app.enable('model cache');
    app.enable('eval cache');
    app.use(express.errorHandler()); 
    app.set('translationMissing', 'default');
    app.settings.quiet = true;
});


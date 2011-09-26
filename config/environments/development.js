var express = require('express');

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.set('translationMissing', 'display');
    app.disable('view cache');
    app.disable('model cache');
    app.disable('eval cache');
    // app.set('translationMissing', 'default');
});


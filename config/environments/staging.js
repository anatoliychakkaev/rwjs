var express = require('express');

app.configure('staging', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


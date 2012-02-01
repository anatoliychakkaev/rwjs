#!/usr/bin/env node

var app = module.exports = require('railway').createServer();

require('railway-monitor').init(app, 'secret');

if (!module.parent) {
    var port = app.settings.env == 'development' ? 3000 : 8808;
    app.listen(port);
    console.log("Railway server listening on port %d within %s environment", port, app.settings.env);
}


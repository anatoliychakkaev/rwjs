app.config = require('yaml').eval(
    require('fs')
    .readFileSync(app.root + '/config/app_config.yml')
    .toString()
)[app.settings.env || 'development'];

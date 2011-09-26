exports.routes = function (map) {
    map.get('/pages/restore', 'pages#restore');
    map.get('/pages/backup', 'pages#backup');
    map.resources('pages');
    map.post('/pages/reorder', 'pages#reorder');

    map.resources('comments', {only: ['create', 'destroy', 'show', 'update']});
    map.get(/^(.*)$/, 'cms#page');
};

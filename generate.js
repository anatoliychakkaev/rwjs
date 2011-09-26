var fs = require('fs');
var md = require('markdown-js');
var fs = require('fs');
var layout = fs.readFileSync('./layout.html').toString();

module.exports = function () {

    var html = '';
    var header = '';
    var sections = [
        'About',
        'Routing',
        'Controller',
        'Views',
        'Generators',
        'Console',
        'Coffee',
        'Localization',
        'Extensions',
        'Heroku',
    ];

    sections.forEach(function (section) {
        var file = section + '.md';
        var sectionId = section.toLowerCase();

        var code = fs.readFileSync('./wiki/' + file).toString();
        code = md.makeHtml(code);
        code = bootstrapize(code);

        html += '\n<section id="' + sectionId + '">';
        html += code;
        // html += '<h6><a href="/' + sectionId + '.html#disqus_thread">Discuss on #' + sectionId + '</a></h6>';
        html += '</section>\n';

        header += '<li><a href="#' + sectionId + '">' + section + '</a></li>';

        var headerSA = '';
        sections.forEach(function (sec) {
            headerSA += '<li' + (sec == section ? ' class="active"' : '') + '><a href="/' + sec.toLowerCase() + '.html">' + sec + '</a></li>';
        });

        console.log(write(sectionId, headerSA, '<section>' + code + '</section><div class="row"><div class="span8 offset4" id="disqus_thread"></div></div><script>$(function () {var disqus_shortname = \'railwayjs\', disqus_identifier = "<%= page.path %>"; $.getScript("http://railwayjs.disqus.com/embed.js");})</script>'));
      
    });

    return write('index', header, html + '<script>$(function () {$.getScript("http://railwayjs.disqus.com/count.js");})</script>');

}

function write(name, header, html) {
    var file = layout
            .replace('SECTIONS', html)
            .replace('HEADER', header);

    fs.writeFileSync('./public/' + name + '.html', file);
    return name + '.html ' + file.length + ' bytes';
}

function bootstrapize(code) {
    code = code.replace(/<pre><code>/g, '<pre class="prettyprint">');
    code = code.replace(/<\/code><\/pre>/g, '</pre>');
    return code.replace(/<!--! (.*?) -->/g, function (m, x) {
        x = x.split('.');
        var block = x[0];
        var class = x[1];
        if (block === 'row') return '<div class="row">';
        if (block.match(/^end/)) return '</div>';
        if (block === 'col') return '<div class="' + class + '">';
        return '<' + block + (class ? ' class="' + class + '"' : '') + '>';
    });
}

if (!module.parent) {
    console.log(module.exports());
}

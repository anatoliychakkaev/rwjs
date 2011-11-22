if (!window.console) {
    window.console = {};
}
var undef;
function stringify(v) {
    if (v === null) return '<span class="keyword">null</span>';
    if (typeof v === 'undefined') return '<span class="keyword">undefined</span>';
    if (v.constructor === Array) {
        return '<strong class="array">[</strong>' + v.join(', ') + '<strong class="array">]</strong>';
    }
    return v;
}

var c = function () {
    var args = '';
    [].forEach.call(arguments, function (arg, index) {
        var name = '_' + index;
        args += name + ' = ' + stringify(arg) + '<br/>';
        window[name] = arg;
    });
    console.result('Callback called with ' + arguments.length +
    ' arguments<br/>' +
    args, true);
};

var spy = function (name, fn) {
    var aSpy = function (cb) {
        console.result('Spy <strong>"' + name + '"</strong> called', true);
        if (fn) {
            fn.call(this, cb);
        } else {
            if (cb && cb.call) cb();
        }
    }
    aSpy.toString = function () {
        return '';
    };
    return aSpy;
};

AbstractClass.prototype.toString = function () {
    return '' + this.constructor.modelName + '#' + (this.id || 'new') + '';
};
console.log = function () {
    $('#example form').before('<div class="log"><strong class="jugg">jugglingdb></strong> <span class="code">' + [].join.call(arguments, ' ') + '</span></div>');
};
console.result = function (res, noformat) {
    var cls = '';
    if (!noformat) {
        if (res instanceof Error) {
            cls = 'error';
            res = res.message;
        } else if (typeof res === 'string') {
            cls = 'string';
            res = "'" + res + "'";
        } else if (typeof res == 'undefined') {
            return;
        }
        res = '<span class="' + cls + '">' + res + '</span>';
    }
    $('#example form').before('<div class="result"> ' + res + '</div>');
};
console.eval = function (s) {
    s = s.replace(/^\s+/, '');
    console.log(s);
    try {
        console.result(eval.call(null, s));
    } catch(e) {
        console.result(e);
    }
};

$(function () {
    $example = $('#example');

    $('a[rel="demo"]').click(function () {
        demonstrate($(this).attr('href').replace('#', ''));
    });

    var $input = $('#example form input');
    $input[0].focus();
    $input.keydown(function(event) {
        var count = $example.find(".log").size();
        var index = $input.data("index");
        if (index == undefined) index = count;

        if (event.keyCode == 38) {
            index--; // up
        } else if (event.keyCode == 40) {
            index++; // down
        } else {
            return;
        }

        // Out of range at the positive side of the range makes sure
        // we can get back to an empty value.
        if (index >= 0 && index <= count) {
            $input.data("index", index);
            $input.val($example.find(".log").eq(index).find('.code').text());
            $input.setSelection($input.val().length);
        }

        return false;
    });

    $('#example form').submit(function () {
        console.eval($input.val());
        $input.val('');
        $input[0].focus();
        $input.data("index", null);
        return false;
    });

    window.scripts = {};
    $('script[type="text/jugglingdb"]').each(function () {
        scripts[$(this).attr('name')] = $(this).text();
    });

    if (location.hash) {
        demonstrate(location.hash.replace('#', ''));
    } else {
        demonstrate('blank');
    }

    prettyPrint();

});

function demonstrate(name) {
    $('#example div').remove();
    if (scripts[name]) {
        runScript(scripts[name]);
    } else {
    }
}

function runScript(text) {
    eval.call(null, scripts.init);

    var cmds = [];
    text.split(/\n/).forEach(function (s) {
        if (s.replace(/^\s+|\s+$/g, '')) cmds.push(s);
    });
    run();

    function run() {
        var cmd = cmds.shift();
        if (cmd) {
            console.eval(cmd);
            setTimeout(run, 100);
        }
    };
}

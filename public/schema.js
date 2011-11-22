if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var fSlice = Array.prototype.slice,
        aArgs = fSlice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis || window,
                               aArgs.concat(fSlice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        var y = cwd || '.';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = Object_keys(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = function (fn) {
    setTimeout(fn, 0);
};

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.define("path", function (require, module, exports, __dirname, __filename) {
    function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/node_modules/jugglingdb/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"main":"index.js"}
});

require.define("/node_modules/jugglingdb/index.js", function (require, module, exports, __dirname, __filename) {
    exports.Schema = require('./lib/schema').Schema;
exports.AbstractClass = require('./lib/abstract-class').AbstractClass;
exports.Validatable = require('./lib/validatable').Validatable;

});

require.define("/node_modules/jugglingdb/lib/schema.js", function (require, module, exports, __dirname, __filename) {
    /**
 * Module dependencies
 */
var AbstractClass = require('./abstract-class').AbstractClass;
var util = require('util');
var path = require('path');

/**
 * Export public API
 */
exports.Schema = Schema;
// exports.AbstractClass = AbstractClass;

/**
 * Helpers
 */
var slice = Array.prototype.slice;

if (!(function () {}).bind) {
    Function.prototype.bind = function () {
    };
}


/**
 * Shema - classes factory
 * @param name - type of schema adapter (mysql, mongoose, sequelize, redis)
 * @param settings - any database-specific settings which we need to
 * establish connection (of course it depends on specific adapter)
 */
function Schema(name, settings) {
    var schema = this;
    // just save everything we get
    this.name = name;
    this.settings = settings;

    // create blank models pool
    this.models = {};
    this.definitions = {};

    // and initialize schema using adapter
    // this is only one initialization entry point of adapter
    // this module should define `adapter` member of `this` (schema)
    var adapter = require('./adapters/memory.js');

    adapter.initialize(this, function () {
        this.connected = true;
        this.emit('connected');
    }.bind(this));

    // we have an adaper now?
    if (!this.adapter) {
        throw new Error('Adapter is not defined correctly: it should create `adapter` member of schema');
    }

    this.adapter.log = function (query, start) {
        schema.log(query, start);
    };

    this.adapter.logger = function (query) {
        var t1 = Date.now();
        var log = this.log;
        return function (q) {
            log(q || query, t1);
        };
    };
};

util.inherits(Schema, require('events').EventEmitter);

function Text() {
}
Schema.Text = Text;

Schema.prototype.automigrate = function (cb) {
    this.freeze();
    if (this.adapter.automigrate) {
        this.adapter.automigrate(cb);
    } else {
        cb && cb();
    }
};

Schema.prototype.log = function () {
};

Schema.prototype.freeze = function freeze() {
    if (this.adapter.freezeSchema) {
        this.adapter.freezeSchema();
    }
}

/**
 * Define class
 * @param className
 * @param properties - hash of class properties in format
 *                     {property: Type, property2: Type2, ...}
 *                     or
 *                     {property: {type: Type}, property2: {type: Type2}, ...}
 * @param settings - other configuration of class
 */
Schema.prototype.define = function defineClass(className, properties, settings) {
    var schema = this;
    var args = slice.call(arguments);

    if (!className) throw new Error('Class name required');
    if (args.length == 1) properties = {}, args.push(properties);
    if (args.length == 2) settings   = {}, args.push(settings);

    standartize(properties, settings);

    // every class can receive hash of data as optional param
    var newClass = function (data) {
        AbstractClass.call(this, data);
    };

    hiddenProperty(newClass, 'schema', schema);
    hiddenProperty(newClass, 'modelName', className);
    hiddenProperty(newClass, 'cache', {});

    // setup inheritance
    newClass.__proto__ = AbstractClass;
    util.inherits(newClass, AbstractClass);

    // store class in model pool
    this.models[className] = newClass;
    this.definitions[className] = {
        properties: properties,
        settings: settings
    };

    // pass controll to adapter
    this.adapter.define({
        model:      newClass,
        properties: properties,
        settings:   settings
    });

    return newClass;

    function standartize(properties, settings) {
        Object.keys(properties).forEach(function (key) {
            var v = properties[key];
            if (typeof v === 'function') {
                properties[key] = { type: v };
            }
        });
        // TODO: add timestamps fields
        // when present in settings: {timestamps: true}
        // or {timestamps: {created: 'created_at', updated: false}}
        // by default property names: createdAt, updatedAt
    }

};

Schema.prototype.defineForeignKey = function defineForeignKey(className, key) {
    // return if already defined
    if (this.definitions[className].properties[key]) return;

    if (this.adapter.defineForeignKey) {
        this.adapter.defineForeignKey(className, key, function (err, keyType) {
            if (err) throw err;
            this.definitions[className].properties[key] = {type: keyType};
        }.bind(this));
    } else {
        this.definitions[className].properties[key] = {type: Number};
    }
};

Schema.prototype.disconnect = function disconnect() {
    if (typeof this.adapter.disconnect === 'function') {
        this.adapter.disconnect();
    }
};


function hiddenProperty(where, property, value) {
    Object.defineProperty(where, property, {
        writable: false,
        enumerable: false,
        configurable: false,
        value: value
    });
}


});

require.define("/node_modules/jugglingdb/lib/abstract-class.js", function (require, module, exports, __dirname, __filename) {
    /**
 * Module deps
 */
var Validatable = require('./validatable').Validatable;
var Hookable = require('./hookable').Hookable;
var util = require('util');
var jutil = require('./jutil');

exports.AbstractClass = AbstractClass;

jutil.inherits(AbstractClass, Validatable);
jutil.inherits(AbstractClass, Hookable);

/**
 * Abstract class constructor
 */
function AbstractClass(data) {
    var self = this;
    var ds = this.constructor.schema.definitions[this.constructor.modelName];
    var properties = ds.properties;
    var settings = ds.setings;
    data = data || {};

    if (data.id) {
        defineReadonlyProp(this, 'id', data.id);
    }

    Object.defineProperty(this, 'cachedRelations', {
        writable: true,
        enumerable: false,
        configurable: true,
        value: {}
    });

    Object.keys(properties).forEach(function (attr) {
        var _attr    = '_' + attr,
            attr_was = attr + '_was';

        // Hidden property to store currrent value
        Object.defineProperty(this, _attr, {
            writable: true,
            enumerable: false,
            configurable: true,
            value: isdef(data[attr]) ? data[attr] :
            (isdef(this[attr]) ? this[attr] : (
                getDefault(attr)
            ))
        });

        // Public setters and getters
        Object.defineProperty(this, attr, {
            get: function () {
                return this[_attr];
            },
            set: function (value) {
                this[_attr] = value;
            },
            configurable: true,
            enumerable: true
        });

        // Getter for initial property
        Object.defineProperty(this, attr_was, {
            writable: true,
            value: data[attr],
            configurable: true,
            enumerable: false
        });

    }.bind(this));

    function getDefault(attr) {
        var def = properties[attr]['default']
        if (isdef(def)) {
            if (typeof def === 'function') {
                return def();
            } else {
                return def;
            }
        } else {
            return null;
        }
    }

    this.trigger("initialize");
};

/**
 * @param data [optional]
 * @param callback(err, obj)
 */
AbstractClass.create = function (data) {
    var modelName = this.modelName;

    // define callback manually
    var callback = arguments[arguments.length - 1];
    if (arguments.length == 0 || data === callback) {
        data = {};
    }

    if (typeof callback !== 'function') {
        callback = function () {};
    }

    var obj = null;
    // if we come from save
    if (data instanceof AbstractClass && !data.id) {
        obj = data;
        data = obj.toObject(true);
        create();
    } else {
        obj = new this(data);

        // validation required
        obj.isValid(function (valid) {
            if (!valid) {
                callback(new Error('Validation error'), obj);
            } else {
                create();
            }
        });
    }

    function create() {
        obj.trigger('create', function (done) {
            this._adapter().create(modelName, data, function (err, id) {
                if (id) {
                    defineReadonlyProp(obj, 'id', id);
                    this.constructor.cache[id] = obj;
                }
                done.call(this, function () {
                    if (callback) {
                        callback(err, obj);
                    }
                });
            }.bind(this));
        });
    }
};

AbstractClass.exists = function exists(id, cb) {
    this.schema.adapter.exists(this.modelName, id, cb);
};

AbstractClass.find = function find(id, cb) {
    this.schema.adapter.find(this.modelName, id, function (err, data) {
        var obj = null;
        if (data) {
            if (this.cache[data.id]) {
                obj = this.cache[data.id];
                this.call(obj, data);
            } else {
                obj = new this(data);
                this.cache[data.id] = obj;
            }
        }
        cb(err, obj);
    }.bind(this));
};

/**
 * Query collection of objects
 * @param params {where: {}, order: '', limit: 1, offset: 0,...}
 * @param cb (err, array of AbstractClass)
 */
AbstractClass.all = function all(params, cb) {
    if (arguments.length === 1) {
        cb = params;
        params = null;
    }
    var constr = this;
    this.schema.adapter.all(this.modelName, params, function (err, data) {
        var collection = null;
        if (data && data.map) {
            collection = data.map(function (d) {
                var obj = null;
                // really questionable stuff
                // goal is obvious: to not create different instances for the same object
                // but the way it implemented...
                // we can lost some dirty state of object, for example
                // TODO: think about better implementation, test keeping dirty state
                if (constr.cache[d.id]) {
                    obj = constr.cache[d.id];
                    constr.call(obj, d);
                } else {
                    obj = new constr(d);
                    constr.cache[d.id] = obj;
                }
                return obj;
            });
            cb(err, collection);
        }
    });
};

AbstractClass.destroyAll = function destroyAll(cb) {
    this.schema.adapter.destroyAll(this.modelName, function (err) {
        if (!err) {
            Object.keys(this.cache).forEach(function (id) {
                delete this.cache[id];
            }.bind(this));
        }
        cb(err);
    }.bind(this));
};

AbstractClass.count = function (cb) {
    this.schema.adapter.count(this.modelName, cb);
};

AbstractClass.toString = function () {
    return '[Model ' + this.modelName + ']';
}

/**
 * Save instance. When instance haven't id, create method called instead.
 * Triggers: validate, save, update | create
 * @param options {validate: true, throws: false} [optional]
 * @param callback(err, obj)
 */
AbstractClass.prototype.save = function (options, callback) {
    if (typeof options == 'function') {
        callback = options;
        options = {};
    }

    callback = callback || function () {};
    options = options || {};

    if (!('validate' in options)) {
        options.validate = true;
    }
    if (!('throws' in options)) {
        options.throws = false;
    }

    if (options.validate) {
        this.isValid(function (valid) {
            if (valid) {
                save.call(this);
            } else {
                var err = new Error('Validation error');
                // throws option is dangerous for async usage
                if (options.throws) {
                    throw err;
                }
                callback(err, this);
            }
        }.bind(this));
    } else {
        save.call(this);
    }

    function save() {
        this.trigger('save', function (saveDone) {
            var modelName = this.constructor.modelName;
            var data = this.toObject(true);
            var inst = this;
            if (inst.id) {
                inst.trigger('update', function (updateDone) {
                    inst._adapter().save(modelName, data, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            inst.constructor.call(inst, data);
                        }
                        updateDone.call(inst, function () {
                            saveDone.call(inst, function () {
                                callback(err, inst);
                            });
                        });
                    });
                });
            } else {
                inst.constructor.create(inst, function (err) {
                    saveDone.call(inst, function () {
                        callback(err, inst);
                    });
                });
            }

        });
    }
};

AbstractClass.prototype.isNewRecord = function () {
    return !this.id;
};

AbstractClass.prototype._adapter = function () {
    return this.constructor.schema.adapter;
};

AbstractClass.prototype.propertyChanged = function (name) {
    return this[name + '_was'] !== this['_' + name];
};

AbstractClass.prototype.toObject = function (onlySchema) {
    var data = {};
    var ds = this.constructor.schema.definitions[this.constructor.modelName];
    var properties = ds.properties;
    // weird
    Object.keys(onlySchema ? properties : this).concat(['id']).forEach(function (property) {
        data[property] = this[property];
    }.bind(this));
    return data;
};

AbstractClass.prototype.destroy = function (cb) {
    this.trigger('destroy', function (destroyed) {
        this._adapter().destroy(this.constructor.modelName, this.id, function (err) {
            delete this.constructor.cache[this.id];
            destroyed(function () {
                cb && cb(err);
            });
        }.bind(this));
    });
};

AbstractClass.prototype.updateAttribute = function (name, value, cb) {
    data = {};
    data[name] = value;
    this.updateAttributes(data, cb);
};

AbstractClass.prototype.updateAttributes = function updateAttributes(data, cb) {
    var inst = this;
    var model = this.constructor.modelName;
    Object.keys(data).forEach(function (key) {
        this[key] = data[key];
    }.bind(this));

    this.isValid(function (valid) {
        if (!valid) {
            if (cb) {
                cb(new Error('Validation error'));
            }
        } else {
            update.call(this);
        }
    }.bind(this));

    function update() {
        this.trigger('save', function (saveDone) {
            this.trigger('update', function (done) {

                Object.keys(data).forEach(function (key) {
                    data[key] = this[key];
                }.bind(this));

                this._adapter().updateAttributes(model, this.id, data, function (err) {
                    if (!err) {
                        Object.keys(data).forEach(function (key) {
                            inst[key] = data[key];
                            Object.defineProperty(inst, key + '_was', {
                                writable:     false,
                                configurable: true,
                                enumerable:   false,
                                value:        data[key]
                            });
                        });
                    }
                    done.call(inst, function () {
                        saveDone.call(inst, function () {
                            cb(err);
                        });
                    });
                }.bind(this));
            });
        });
    }
};

/**
 * Checks is property changed based on current property and initial value
 * @param {attr} String - property name
 * @return Boolean
 */
AbstractClass.prototype.propertyChanged = function (attr) {
    return this['_' + attr] !== this[attr + '_was'];
};

AbstractClass.prototype.reload = function (cb) {
    this.constructor.find(this.id, cb);
};

// relations
AbstractClass.hasMany = function (anotherClass, params) {
    var methodName = params.as; // or pluralize(anotherClass.modelName)
    var fk = params.foreignKey;
    // console.log(this.modelName, 'has many', anotherClass.modelName, 'as', params.as, 'queried by', params.foreignKey);
    // each instance of this class should have method named
    // pluralize(anotherClass.modelName)
    // which is actually just anotherClass.all({thisModelNameId: this.id}, cb);
    defineScope(this.prototype, anotherClass, methodName, function () {
        var x = {};
        x[fk] = this.id;
        return {where: x};
    }, {
        find: find,
        destroy: destroy
    });

    // obviously, anotherClass should have attribute called `fk`
    anotherClass.schema.defineForeignKey(anotherClass.modelName, fk);

    function find(id, cb) {
        anotherClass.find(id, function (err, inst) {
            if (err) return cb(err);
            if (inst[fk] === this.id) {
                cb(null, inst);
            } else {
                cb(new Error('Permission denied'));
            }
        }.bind(this));
    }

    function destroy(id, cb) {
        this.find(id, function (err, inst) {
            if (err) return cb(err);
            if (inst) {
                inst.destroy(cb);
            } else {
                cb(new Error('Not found'));
            }
        });
    }

};

AbstractClass.belongsTo = function (anotherClass, params) {
    var methodName = params.as;
    var fk = params.foreignKey;
    this.schema.defineForeignKey(anotherClass.modelName, fk);
    this.prototype[methodName] = function (p, cb) {
        if (p instanceof AbstractClass) { // acts as setter
            this[fk] = p.id;
            this.cachedRelations[methodName] = p;
        } else if (typeof p === 'function') { // acts as async getter
            this.find(this[fk], function (err, obj) {
                if (err) return p(err);
                this.cachedRelations[methodName] = obj;
            }.bind(this));
        } else if (!p) { // acts as sync getter
            return this.cachedRelations[methodName] || this[fk];
        }
    };
};

AbstractClass.scope = function (name, params) {
    defineScope(this, this, name, params);
};

function defineScope(cls, targetClass, name, params, methods) {

    // collect meta info about scope
    if (!cls._scopeMeta) {
        cls._scopeMeta = {};
    }

    // anly make sence to add scope in meta if base and target classes
    // are same
    if (cls === targetClass) {
        cls._scopeMeta[name] = params;
    } else {
        if (!targetClass._scopeMeta) {
            targetClass._scopeMeta = {};
        }
    }

    Object.defineProperty(cls, name, {
        enumerable: false,
        configurable: true,
        get: function () {
            var f = function caller(cond, cb) {
                var actualCond;
                if (arguments.length === 1) {
                    actualCond = {};
                    cb = cond;
                } else if (arguments.length === 2) {
                    actualCond = cond;
                } else {
                    throw new Error('Method only can be called with one or two arguments');
                }

                return targetClass.all(mergeParams(actualCond, caller._scope), cb);
            };
            f._scope = typeof params === 'function' ? params.call(this) : params;
            f.build = build;
            f.create = create;
            f.destroyAll = destroyAll;
            for (var i in methods) {
                f[i] = methods;
            }

            // define sub-scopes
            Object.keys(targetClass._scopeMeta).forEach(function (name) {
                Object.defineProperty(f, name, {
                    enumerable: false,
                    get: function () {
                        mergeParams(f._scope, targetClass._scopeMeta[name]);
                        return f;
                    }
                });
            }.bind(this));
            return f;
        }
    });

    // and it should have create/build methods with binded thisModelNameId param
    function build(data) {
        data = data || {};
        return new targetClass(mergeParams(this._scope, {where:data}).where);
    }

    function create(data, cb) {
        if (typeof data === 'function') {
            cb = data;
            data = {};
        }
        this.build(data).save(cb);
    }

    function destroyAll(id, cb) {
        // implement me
    }

    function mergeParams(base, update) {
        if (update.where) {
            base.where = merge(base.where, update.where);
        }

        // overwrite order
        if (update.order) {
            base.order = update.order;
        }

        return base;

    }
}

// helper methods
//
function isdef(s) {
    var undef;
    return s !== undef;
}

function merge(base, update) {
    base = base || {};
    if (update) {
        Object.keys(update).forEach(function (key) {
            base[key] = update[key];
        });
    }
    return base;
}

function defineReadonlyProp(obj, key, value) {
    Object.defineProperty(obj, key, {
        writable: false,
        enumerable: true,
        configurable: true,
        value: value
    });
}


});

require.define("/node_modules/jugglingdb/lib/validatable.js", function (require, module, exports, __dirname, __filename) {
    exports.Validatable = Validatable;

function Validatable() {
    // validatable class
};

Validatable.validatesPresenceOf = getConfigurator('presence');
Validatable.validatesLengthOf = getConfigurator('length');
Validatable.validatesNumericalityOf = getConfigurator('numericality');
Validatable.validatesInclusionOf = getConfigurator('inclusion');
Validatable.validatesExclusionOf = getConfigurator('exclusion');
Validatable.validatesFormatOf = getConfigurator('format');
Validatable.validate = getConfigurator('custom');
Validatable.validateAsync = getConfigurator('custom', {async: true});
Validatable.validatesUniquenessOf = getConfigurator('uniqueness', {async: true});

// implementation of validators
var validators = {
    presence: function (attr, conf, err) {
        if (blank(this[attr])) {
            err();
        }
    },
    length: function (attr, conf, err) {
        if (nullCheck.call(this, attr, conf, err)) return;

        var len = this[attr].length;
        if (conf.min && len < conf.min) {
            err('min');
        }
        if (conf.max && len > conf.max) {
            err('max');
        }
        if (conf.is && len !== conf.is) {
            err('is');
        }
    },
    numericality: function (attr, conf, err) {
        if (nullCheck.call(this, attr, conf, err)) return;

        if (typeof this[attr] !== 'number') {
            return err('number');
        }
        if (conf.int && this[attr] !== Math.round(this[attr])) {
            return err('int');
        }
    },
    inclusion: function (attr, conf, err) {
        if (nullCheck.call(this, attr, conf, err)) return;

        if (!~conf.in.indexOf(this[attr])) {
            err()
        }
    },
    exclusion: function (attr, conf, err) {
        if (nullCheck.call(this, attr, conf, err)) return;

        if (~conf.in.indexOf(this[attr])) {
            err()
        }
    },
    format: function (attr, conf, err) {
        if (nullCheck.call(this, attr, conf, err)) return;

        if (typeof this[attr] === 'string') {
            if (!this[attr].match(conf['with'])) {
                err();
            }
        } else {
            err();
        }
    },
    custom: function (attr, conf, err, done) {
        conf.customValidator.call(this, err, done);
    },
    uniqueness: function (attr, conf, err, done) {
        var cond = {where: {}};
        cond.where[attr] = this[attr];
        this.constructor.all(cond, function (error, found) {
            if (found.length > 1) {
                err();
            } else if (found.length === 1 && found[0].id !== this.id) {
                err();
            }
            done();
        }.bind(this));
    }
};


function getConfigurator(name, opts) {
    return function () {
        configure(this, name, arguments, opts);
    };
}

Validatable.prototype.isValid = function (callback) {
    var valid = true, inst = this, wait = 0, async = false;

    // exit with success when no errors
    if (!this.constructor._validations) {
        cleanErrors(this);
        if (callback) {
            callback(valid);
        }
        return valid;
    }

    Object.defineProperty(this, 'errors', {
        enumerable: false,
        configurable: true,
        value: new Errors
    });

    this.trigger('validation', function (validationsDone) {
        var inst = this;
        this.constructor._validations.forEach(function (v) {
            if (v[2] && v[2].async) {
                valid = false;
                async = true;
                wait += 1;
                validationFailed(inst, v, done);
            } else {
                if (validationFailed(inst, v)) {
                    valid = false;
                }
            }

        });

        var asyncFail = false;
        function done(fail) {
            asyncFail = asyncFail || fail;
            if (--wait === 0 && callback) {
                validationsDone.call(inst, function () {
                    callback(!asyncFail);
                });
            }
        }

    });

    if (valid) cleanErrors(this);
    if (!async && callback) callback(valid);

    return valid;
};

function cleanErrors(inst) {
    Object.defineProperty(inst, 'errors', {
        enumerable: false,
        configurable: true,
        value: false
    });
}

function validationFailed(inst, v, cb) {
    var attr = v[0];
    var conf = v[1];
    var opts = v[2] || {};

    if (typeof attr !== 'string') return false;

    // here we should check skip validation conditions (if, unless)
    // that can be specified in conf
    if (skipValidation(inst, conf, 'if')) return false;
    if (skipValidation(inst, conf, 'unless')) return false;

    var fail = false;
    var validator = validators[conf.validation];
    var validatorArguments = [];
    validatorArguments.push(attr);
    validatorArguments.push(conf);
    validatorArguments.push(function onerror(kind) {
        var message;
        if (conf.message) {
            message = conf.message;
        }
        if (!message && defaultMessages[conf.validation]) {
            message = defaultMessages[conf.validation];
        }
        if (!message) {
            message = 'is invalid';
        }
        if (kind) {
            if (message[kind]) {
                // get deeper
                message = message[kind];
            } else if (defaultMessages.common[kind]) {
                message = defaultMessages.common[kind];
            }
        }
        inst.errors.add(attr, message);
        fail = true;
    });
    if (cb) {
        validatorArguments.push(function () {
            cb(fail);
        });
    }
    validator.apply(inst, validatorArguments);
    return fail;
}

function skipValidation(inst, conf, kind) {
    var doValidate = true;
    if (typeof conf[kind] === 'function') {
        doValidate = conf[kind].call(inst);
        if (kind === 'unless') doValidate = !doValidate;
    } else if (typeof conf[kind] === 'string') {
        if (inst.hasOwnProperty(conf[kind])) {
            doValidate = inst[conf[kind]];
            if (kind === 'unless') doValidate = !doValidate;
        } else if (typeof inst[conf[kind]] === 'function') {
            doValidate = inst[conf[kind]].call(inst);
            if (kind === 'unless') doValidate = !doValidate;
        } else {
            doValidate = kind === 'if';
        }
    }
    return !doValidate;
}

var defaultMessages = {
    presence: 'can\'t be blank',
    length: {
        min: 'too short',
        max: 'too long',
        is: 'length is wrong'
    },
    common: {
        blank: 'is blank',
        'null': 'is null'
    },
    numericality: {
        'int': 'is not an integer',
        'number': 'is not a number'
    },
    inclusion: 'is not included in the list',
    exclusion: 'is reserved',
    uniqueness: 'is not unique'
};

function nullCheck(attr, conf, err) {
    var isNull = this[attr] === null || !(attr in this);
    if (isNull) {
        if (!conf.allowNull) {
            err('null');
        }
        return true;
    } else {
        if (blank(this[attr])) {
            if (!conf.allowBlank) {
                err('blank');
            }
            return true;
        }
    }
    return false;
}

function blank(v) {
    if (typeof v === 'undefined') return true;
    if (v instanceof Array && v.length === 0) return true;
    if (v === null) return true;
    if (typeof v == 'string' && v === '') return true;
    return false;
}

function configure(cls, validation, args, opts) {
    if (!cls._validations) {
        Object.defineProperty(cls, '_validations', {
            writable: true,
            configurable: true,
            enumerable: false,
            value: []
        });
    }
    args = [].slice.call(args);
    var conf;
    if (typeof args[args.length - 1] === 'object') {
        conf = args.pop();
    } else {
        conf = {};
    }
    if (validation === 'custom' && typeof args[args.length - 1] === 'function') {
        conf.customValidator = args.pop();
    }
    conf.validation = validation;
    args.forEach(function (attr) {
        cls._validations.push([attr, conf, opts]);
    });
}

function Errors() {
}

Errors.prototype.add = function (field, message) {
    if (!this[field]) {
        this[field] = [message];
    } else {
        this[field].push(message);
    }
};


});

require.define("/node_modules/jugglingdb/lib/hookable.js", function (require, module, exports, __dirname, __filename) {
    exports.Hookable = Hookable;

function Hookable() {
    // hookable class
};

Hookable.afterInitialize = null;
Hookable.beforeValidation = null;
Hookable.afterValidation = null;
Hookable.beforeSave = null;
Hookable.afterSave = null;
Hookable.beforeCreate = null;
Hookable.afterCreate = null;
Hookable.beforeUpdate = null;
Hookable.afterUpdate = null;
Hookable.beforeDestroy = null;
Hookable.afterDestroy = null;

Hookable.prototype.trigger = function trigger(actionName, work) {
    var capitalizedName = capitalize(actionName);
    var afterHook = this.constructor["after" + capitalizedName];
    var beforeHook = this.constructor["before" + capitalizedName];
    var inst = this;

    // we only call "before" hook when we have actual action (work) to perform
    if (work) {
        if (beforeHook) {
            // before hook should be called on instance with one param: callback
            beforeHook.call(inst, function () {
                // actual action also have one param: callback
                work.call(inst, next);
            });
        } else {
            work.call(inst, next);
        }
    } else {
        next();
    }

    function next(done) {
        if (afterHook) afterHook.call(inst, done);
        else if (done) done.call(this);
    }
};

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

});

require.define("util", function (require, module, exports, __dirname, __filename) {
    this.inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype,
      { constructor: { value: ctor, enumerable: false,
        writable: true, configurable: true } });
};

});

require.define("/node_modules/jugglingdb/lib/jutil.js", function (require, module, exports, __dirname, __filename) {
    exports.inherits = function (newClass, baseClass) {
    Object.keys(baseClass).forEach(function (classMethod) {
        newClass[classMethod] = baseClass[classMethod];
    });
    Object.keys(baseClass.prototype).forEach(function (instanceMethod) {
        newClass.prototype[instanceMethod] = baseClass.prototype[instanceMethod];
    });
};


});

require.define("/node_modules/jugglingdb/lib/adapters/memory.js", function (require, module, exports, __dirname, __filename) {
    exports.initialize = function initializeSchema(schema, callback) {
    schema.adapter = new Memory();
    process.nextTick(callback);
};

function Memory() {
    this._models = {};
    this.cache = {};
    this.ids = {};
}

Memory.prototype.define = function defineModel(descr) {
    var m = descr.model.modelName;
    this._models[m] = descr;
    this.cache[m] = {};
    this.ids[m] = 1;
};

Memory.prototype.create = function create(model, data, callback) {
    var id = this.ids[model]++;
    data.id = id;
    this.cache[model][id] = data;
    callback(null, id);
};

Memory.prototype.save = function save(model, data, callback) {
    this.cache[model][data.id] = data;
    callback();
};

Memory.prototype.exists = function exists(model, id, callback) {
    callback(null, this.cache[model].hasOwnProperty(id));
};

Memory.prototype.find = function find(model, id, callback) {
    callback(null, this.cache[model][id]);
};

Memory.prototype.destroy = function destroy(model, id, callback) {
    delete this.cache[model][id];
    callback();
};

Memory.prototype.all = function all(model, filter, callback) {
    var nodes = Object.keys(this.cache[model]).map(function (key) {
        return this.cache[model][key];
    }.bind(this));
    process.nextTick(function () {
        callback(null, filter && nodes ? nodes.filter(applyFilter(filter)) : nodes);
    });
};

function applyFilter(filter) {
    if (typeof filter.where === 'function') {
        return filter.where;
    }
    var keys = Object.keys(filter.where);
    return function (obj) {
        var pass = true;
        keys.forEach(function (key) {
            if (!test(filter.where[key], obj[key])) {
                pass = false;
            }
        });
        return pass;
    }

    function test(example, value) {
        if (typeof value === 'string' && example && example.constructor.name === 'RegExp') {
            return value.match(example);
        }
        // not strict equality
        return example == value;
    }
}

Memory.prototype.destroyAll = function destroyAll(model, callback) {
    Object.keys(this.cache[model]).forEach(function (id) {
        delete this.cache[model][id];
    }.bind(this));
    this.cache[model] = {};
    callback();
};

Memory.prototype.count = function count(model, callback) {
    callback(null, Object.keys(this.cache[model]).length);
};

Memory.prototype.updateAttributes = function updateAttributes(model, id, data, cb) {
    data.id = id;
    var base = this.cache[model][id];
    this.save(model, merge(base, data), cb);
};

function merge(base, update) {
    Object.keys(update).forEach(function (key) {
        base[key] = update[key];
    });
    return base;
}


});

require.define("events", function (require, module, exports, __dirname, __filename) {
    if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/entry.js", function (require, module, exports, __dirname, __filename) {
    var jugg = window.jugglingdb = require('jugglingdb');
var Schema = window.Schema = jugg.Schema;
window.AbstractClass = jugg.AbstractClass;
window.schema = new Schema('memory');


});
require("/entry.js");

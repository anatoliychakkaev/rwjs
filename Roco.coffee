namespace 'rwjs', ->
    task 'schema', ->
        localRun 'browserify -e entry.js -o public/schema.js'

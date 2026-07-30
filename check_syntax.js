var fs = require('fs');
var files = ['js/data.js', 'js/supabase-db.js', 'js/excel-parser.js', 'js/skcr.js', 'js/app.js'];
files.forEach(function(f) {
    try {
        var content = fs.readFileSync(f, 'utf8');
        new Function(content);
        console.log('OK: ' + f);
    } catch(e) {
        console.log('SYNTAX ERROR in ' + f + ': ' + e.message);
    }
});

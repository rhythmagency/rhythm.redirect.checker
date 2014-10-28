var wait = require('wait.for');
var request = require('request');
var fs = require('fs-extra');
var parse = require('csv-parse');
var transform = require('stream-transform');

if(process.argc < 5){
    console.log('usage: node app.js redirects.csv domainToStrip.com https://baseURL.com');
    process.exit();
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var csvFilename = process.argv[2];
var domainToStrip = process.argv[3];
var baseURL = process.argv[4];

var csvOutputFilename = 'out_' + csvFilename.split('.csv').join('.txt');

var input = fs.createReadStream(csvFilename);
var parser = parse({delimiter: ','});

//clear output file
fs.truncateSync(csvOutputFilename, 0);

var output = fs.createWriteStream(csvOutputFilename);

var transformer = transform(function(record, callback) {
    wait.launchFiber(function() {
        //console.log(record);
        var urlA = record[0].replace(/^https?:\/\/[^\/]+\//i, '/');

        var regex = new RegExp('^'+domainToStrip, 'i');
        var urlB = record[1].replace(/^https?:\/\/[^\/]+\//i, '/').replace(regex, '').replace('//', '/');
        if (urlB == '')
            urlB = '/';

        var line = [urlA, urlB].join('\t') + '\n';

        try {
            var response = wait.forMethod(request, "head", baseURL + urlA, {followRedirect: false});
            console.log(response.statusCode);
            if(response.statusCode >= 400) {
                callback(null, line);
            }else{
                callback(null, '');
            }
        }catch(err){
            console.log(err);
            callback(null, line);
        }
    });
}, {parallel: 0});

var p = input.pipe(parser).pipe(transformer).pipe(output);
p.on('finish', function() {
    console.log('Done');
});

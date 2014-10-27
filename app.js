if(process.argc < 4){
    console.log('usage: node app.js redirects.csv https://domain.com');
    process.exit();
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var csvFilename = process.argv[2];
var domainName = process.argv[3];

var csvOutputFilename = 'out_' + csvFilename.split('.csv').join('.txt');

var wait = require('wait.for');
var request = require('request');
var fs = require('fs-extra');
var parse = require('csv-parse');
var transform = require('stream-transform');

var input = fs.createReadStream(csvFilename);
var parser = parse({delimiter: ','});

fs.truncateSync(csvOutputFilename, 0);
var output = fs.createWriteStream(csvOutputFilename);

var transformer = transform(function(record, callback) {
    wait.launchFiber(function() {
        //console.log(record);
        var urlA = record[0].replace(/^https?:\/\/[^\/]+\//i, '/');
        var urlB = record[1].replace(/^https?:\/\/[^\/]+\//i, '/').replace(/^smartstopselfstorage\.com/i, '').replace('//', '/');
        if (urlB == '')
            urlB = '/';

//        urlA = domainName + urlA;
//        urlB = domainName + urlB;

        var line = [urlA, urlB].join('\t') + '\n';

        try {
            var response = wait.forMethod(request, "head", domainName + urlA, {followRedirect: false});
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

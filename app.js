var wait = require('wait.for');
var request = require('request');
var fs = require('fs-extra');
var parse = require('csv-parse');
var transform = require('stream-transform');
var url = require('url');
var trim = require('trimmer');

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

var domainRegex = new RegExp('^'+domainToStrip, 'i');
var httpRegex = new RegExp('^https?:\/\/[^\/]+\/', 'i');
var langPrefixRegex = new RegExp('^(/en|/es|/fr-ca|/ru)?');

var transformer = transform(function(record, callback) {
    wait.launchFiber(function() {
        //console.log(record);
        var urlA = record[0].replace(httpRegex, '/').replace(langPrefixRegex, '');
        var urlB = record[1].replace(httpRegex, '/').replace(domainRegex, '').replace('//', '/').replace(langPrefixRegex, '');
        if (urlB == '')
            urlB = '/';

        var line = [urlA, urlB].join('\t');

        try {
            var response = wait.forMethod(request, "head", baseURL + urlA, {followRedirect: false});

            console.log(response.statusCode);
            console.log(baseURL + urlA);
            console.log('');

            line = response.statusCode+'\t'+line;

            var compareURLs = false;
            var trimmedLocation = '';
            if(response.statusCode >= 300 && response.statusCode < 400){
                compareURLs = true;
                trimmedLocation = trim.right(response.headers.location.replace(httpRegex, '/').replace(domainRegex, '').replace('//', '/').replace(langPrefixRegex, ''), '/');
                line = line + '\t' + response.headers.location;
            }

            if(response.statusCode >= 400 || (compareURLs && trim.right(urlB, '/') != trimmedLocation)) {
                callback(null, line + '\n');
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

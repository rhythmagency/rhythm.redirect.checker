# rhythm.redirect.checker v0.1.0
> Take a csv of 404 urls and corresponding redirect urls and check the server response then compile a new list of links that are still not 2XX or 3XX. Use it to check the results of your 301 redirects.

## Getting Started
_Prepare your .csv with no header columns with the 404 url in the first column and the correct url to redirect to in the second column._

### Usage

```$ node app.js redirects.csv domaintostripfromredirects.com http://domaintousefortests.com```

### Output TSV

```statusCode    inURL    outURL    actualURL```
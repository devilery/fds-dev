// credits go to https://github.com/jmervine/node-http-debug/blob/f4b4b8e2f4e805a5c1b7c4533303fc588fc7107a/index.js

module.exports.http = httpDebug('http');
module.exports.https = httpDebug('https');

const util = require('util');

function httpDebug(proto) {
    var http = require(proto);

    // on states: true || 1 || 2
    // off states: false || 0
    if (typeof process.env.HTTP_DEBUG === 'undefined' || process.env.HTTP_DEBUG === 'false') {
        http.debug = 0;
    } else {
        http.debug = 1;
    }

    http.__request = http.request;

    http.request = function httpDebugRequest(options: {}) {
        var request = http.__request.apply(http, arguments);

        if (!!(http.debug)) {
            // debug messaging for initial request
            console.log('[outgoing]', `${options.method.toUpperCase()} ${proto}://${options.hostname}${options.path}`)
            // console.error(util.inspect(options));

            // handle debug messaging for request methods
            request.__write = request.write;
            request.write   = function httpDebugWrite(data) {
                console.dir(data);
                return request.__write.apply(request, arguments);
            };

            // request.__end = request.end;
            // request.end   = function httpDebugEnd(data) {
            //     if (data) {
            //         console.dir(data);
            //     }
            //     return request.__end.apply(request, arguments);
            // };
        }

        return request;

    };

    return http;
}

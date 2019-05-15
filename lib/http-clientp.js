"use strict";
const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const HttpsProxyAgent = require('https-proxy-agent');
const debug = require('debug')('http-clientp');

/*http.globalAgent.keepAlive = true;
https.globalAgent.keepAlive = true;*/

exports.request = function (options, callback, httpcontext) {
    httpcontext = init_httpcontext(httpcontext);
    options.headers = this.merge_headers(options.headers, httpcontext.request.headers);
    if (!options.headers) {
        options.headers = {}
    }
    if (!options.method) {
        options.method = 'GET'
    }
    let encode = options.encode;
    if (encode === undefined) {
        encode = httpcontext.request.encode;
    }
    if (encode === undefined || encode === true) {
        options.path = encodeURI(options.path);
    }
    let timeout = httpcontext.request.timeout;
    if (httpcontext.request && httpcontext.request.proxy) {
        debug('[http-client] 正在打开地址 [%s] with porxy [%s]', options.path, JSON.stringify(httpcontext.request.proxy));
    } else if (httpcontext.request && httpcontext.request.http_proxy) {
        debug('[http-client] 正在打开地址 [%s] with http porxy [%s]', options.path, httpcontext.request.http_proxy);
    } else {
        debug('[http-client] 正在打开地址 [%s] ', options.path);
    }
    if (options.headers.Accept == null) {
        options.headers.Accept = 'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5';
    }
    if (options.headers['Accept-Language'] == null) {
        options.headers['Accept-Language'] = 'zh-CN,zh';
    }
    let urlObj = url.parse(options.path);
    let protocol = urlObj.protocol;
    if (protocol.indexOf('http') === -1) {
        options.path = 'http://' + options.path;
        urlObj = url.parse(options.path);
        protocol = urlObj.protocol;
    }
    let host = urlObj.host;
    let port = urlObj.port;
    let hostname = urlObj.hostname;

    options.headers.host = host;
    //options.headers.Referer = host;
    options.host = hostname;
    options.port = port;
    let content = null;
    if (options.method.toLocaleUpperCase() == 'POST' && httpcontext.request.postdata) {
        var contentType = options.headers['content-type'];
        if (contentType == null) {
            contentType = options.headers['Content-Type'];
        }
        if (typeof httpcontext.request.postdata === 'string') {
            content = httpcontext.request.postdata;
        } else if (contentType.indexOf('application/json') != -1) {
            content = JSON.stringify(httpcontext.request.postdata);
        } else {
            content = querystring.stringify(httpcontext.request.postdata);
        }
        content = new Buffer(content);
        if (contentType.indexOf('gb') != -1) {
            content = iconv.encode(content, 'gbk');
        }
        options.headers['Content-Length'] = content.length;
    }
    let httpClient = null;
    if ('https:' === protocol) {
        if (!options.port) {
            options.port = 443;
        }
        httpClient = https;
        options.rejectUnauthorized = false;
    } else {
        if (!options.port) {
            options.port = 80;
        }
        httpClient = http;
    }
    let agent = null;
    if (!options.agent) {
        if (httpcontext.request.proxy && 'https:' === protocol) {
            agent = new HttpsProxyAgent(httpcontext.request.proxy);
        } else if (httpcontext.request.http_proxy && 'https:' === protocol) {
            agent = new HttpsProxyAgent(httpcontext.request.http_proxy);
        } else if (httpcontext.request.proxy && 'http:' === protocol) {
            options.host = httpcontext.request.proxy.host;
            options.port = httpcontext.request.proxy.port;
        } else if (httpcontext.request.http_proxy && 'http:' === protocol) {
            var http_proxy = httpcontext.request.http_proxy.match("([\\d]{1,3}\\.[\\d]{1,3}\\.[\\d]{1,3}\\.[\\d]{1,3}):([\\d]{4,5})");
            options.host = http_proxy[1];
            options.port = http_proxy[2];
        }
        options.agent = agent;
    }
    httpcontext.request.requestTime = Date.now();
    let req = httpClient.request(options, function (res) {
        httpcontext.response.responseTime = Date.now();
        httpcontext.request.TTLB = (httpcontext.response.responseTime - httpcontext.request.requestTime) / 1000;
        let resEncode = res.headers['content-type'];
        if (resEncode) {
            resEncode = res.headers['Content-Type'];
        }
        let charset = httpcontext.response.charset;
        let chunks = [];
        if (charset == null) {
            if (resEncode && resEncode.toLowerCase().indexOf('gb') > -1) {
                charset = 'gbk';
            } else {
                charset = 'utf-8';
            }
        }
        let code = res.statusCode;
        httpcontext.response.statusCode = code;
        res.on('data', function (d) {
            chunks.push(d);
        });
        res.on('end', function () {
            debug('[RESPONSE] 请求响应的状态码是[%s]. 请求地址是[%s].', code, options.path);
            let data = Buffer.concat(chunks);
            if (charset != 'buffer') {
                data = iconv.decode(data, charset);
            }
            callback(null, data, res, httpcontext);
        });
        res.on('error', function (error) {
            console.error('[RESPONSE] 请求响应的状态码是[%s]. 请求地址是[%s].请求错误信息是[%s]', code, options.path, JSON.stringify(error));
            callback(error, null, res, httpcontext);
        });
    });
    req.on('socket', function (socket) {
        socket.on('error', function (error) {
            console.error('[REQUEST]请求地址是[%s]. 监控到 socket 异常.异常信息是[%s]. ', options.path, JSON.stringify(error));
        });
    });
    req.on('error', function (error) {
        console.error('[REQUEST] 请求地址是[%s]. 请求参数是[%s]. 请求异常,异常信息是[%s]. ', options.path, content, JSON.stringify(error));
        callback(error, null, null, httpcontext);
    });
    if (timeout) {
        req.setTimeout(timeout, function () {
            console.error('[REQUEST] 请求[%s]超时.', options.path);
            callback('request timeout ' + timeout, null, null, httpcontext)
        });
    }
    if (content) {
        req.write(content);
    }
    req.end();
};
exports.get = function (url, callback, httpcontext) {
    let options = null;
    if (typeof url === 'object') {
        options = url;
        options.method = 'GET';
    } else {
        let headers = null;
        if (httpcontext && httpcontext.request) {
            headers = httpcontext.request.headers;
        }
        options = this.build_options('GET', url, headers);
    }
    if (options) {
        options.headers = this.init_headers(options.method, options.headers);
    }
    this.request(options, callback, httpcontext);
};
exports.post = function (url, callback, httpcontext) {
    let options = null;
    if (typeof url === 'object') {
        options = url;
        options.method = 'POST';
    } else {
        let headers = null;
        if (httpcontext && httpcontext.request) {
            headers = httpcontext.request.headers;
        }
        options = this.build_options('POST', url, headers);
    }
    if (options) {
        options.headers = this.init_headers(options.method, options.headers);
    }
    this.request(options, callback, httpcontext);
};
exports.requestp = function (httpcontext) {
    let options = httpcontext.request.options;
    this.request(options, function (error, body, res, httpcontext) {
        httpcontext.response.body = body;
        httpcontext.error = error;
        httpcontext.res = res;
        if (typeof httpcontext.callback === 'function') {
            httpcontext.callback(httpcontext);
        } else {
            console.error('[ERROR-requestp]requestp.httpcontext.callback 不是 function. ' + httpcontext.callback);
        }
    }, httpcontext);
};
global.http_proxy = null;
//httpcontext-请求上下文。callback-获得代理的函数
exports.request_select_proxy = function (httpcontext, callback) {
    let self = this;
    let proxy_model = httpcontext.proxymodel;
    if (!proxy_model) {
        proxy_model = global.proxymodel;
    }
    if (!proxy_model) {
        self.init_httpcontext_options_headers(httpcontext);
        self.requestp(httpcontext);
    } else if ('default' === proxy_model) {
        if (global.http_proxy) {
            httpcontext.request.proxy = global.http_proxy;
        }
        self.init_httpcontext_options_headers(httpcontext);
        self.requestp(httpcontext);
    } else if ('fix' === proxy_model) {
        init_httpcontext(httpcontext);
        if (httpcontext.request.proxy) {
            self.init_httpcontext_options_headers(httpcontext);
            self.requestp(httpcontext);
        } else {
            if (typeof callback === 'function') {
                callback(function (httpcontext) {
                    self.init_httpcontext_options_headers(httpcontext);
                    self.requestp(httpcontext);
                });
            } else {
                console.error('[ERROR-fix]requestSeleteProxy 参数 callback 不是 function. ' + callback);
            }
        }
    } else if ('dynamic' === proxy_model) {
        if (typeof callback === 'function') {
            callback(function (httpcontext) {
                self.init_httpcontext_options_headers(httpcontext);
                self.requestp(httpcontext);
            });
        } else {
            console.error('[ERROR-dynamic]requestSeleteProxy 参数 callback 不是 function. ' + callback);
        }
    }
};

function init_httpcontext(httpcontext) {
    if (!httpcontext) {
        httpcontext = {};
    }
    if (!httpcontext.request) {
        httpcontext.request = {};
    }
    if (!httpcontext.response) {
        httpcontext.response = {};
    }
    if (httpcontext.options && httpcontext.options.host && httpcontext.options.port && !httpcontext.request.proxy) {
        httpcontext.request.proxy = {
            'host': options.host,
            'port': options.port
        }
    }
    return httpcontext;
}

exports.build_options = function (method, url, headers) {
    let options = {
        method: method,
        path: url,
        headers: headers
    };
    return options;
};
exports.init_httpcontext_options_headers = function (httpcontext) {
    let options = httpcontext.request.options;
    options.headers = this.init_headers(options.method, options.headers);
    return options;
};
exports.build_httpcontext = function (options, data, postdate, proxy, timeout) {
    let op = {};
    if (typeof options === 'string') {
        op.method = options;
        op.path = data.url;
    } else {
        op = options;
    }
    let httpcontext =
        {
            'request': {
                'proxy': proxy,
                'postdata': postdate,
                'options': op,
                'timeout': timeout
            },
            'response': {},
            'data': data
        };
    return httpcontext;
};
exports.init_headers = function (method, headers) {
    if (headers == null) {
        headers = {};
        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
        if (method != null && 'POST' == method.toUpperCase()) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        }
    } else {
        if (headers['User-Agent'] == null && headers['user-agent'] == null) {
            headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
        }
        if (method != null && 'POST' == method.toUpperCase() && headers['Content-Type'] == null && headers['content-type'] == null) {
            headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        }
    }
    return headers;
};
exports.merge_headers = function (headers_0, headers_1) {
    if (headers_0 != null && headers_1 == null) {
        return headers_0;
    }

    if (headers_0 == null && headers_1 != null) {
        return headers_1;
    }

    if (headers_0 != null && headers_1 != null) {
        for (let key in headers_0) {
            headers_1[key] = headers_0[key];
        }
        return headers_1;
    }
    return headers_0;
};
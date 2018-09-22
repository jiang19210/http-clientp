"use strict";
const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const HttpsProxyAgent = require('https-proxy-agent');
const debug = require('debug')('http-clientp');

exports.request = function (options, callback, httpcontext) {
    httpcontext = init_httpcontext(httpcontext);
    if (!options.headers) {
        options.headers = {}
    }
    if (!options.method) {
        options.method = 'GET'
    }
    let encode = options.encode;
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

    options.headers.Accept = 'application/json, text/plain, */*';
    options.headers['Accept-Language'] = 'zh-CN,zh';
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
        var ContentType = options.headers['content-type'];
        if (typeof httpcontext.request.postdata === 'string') {
            content = httpcontext.request.postdata;
        } else if (ContentType.indexOf('application/json') != -1) {
            content = JSON.stringify(httpcontext.request.postdata);
        } else {
            content = querystring.stringify(httpcontext.request.postdata);
        }
        content = new Buffer(content);
        if (ContentType.indexOf('gb') != -1) {
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
        } else {
            agent = new httpClient.Agent({'keepAlive': true});
        }
        options.agent = agent;
    }
    httpcontext.request.requestTime = Date.now();
    let req = httpClient.request(options, function (res) {
        httpcontext.response.responseTime = Date.now();
        httpcontext.request.TTLB = (httpcontext.response.responseTime - httpcontext.request.requestTime) / 1000;
        let resEncode = res.headers['content-type'];
        let charset = httpcontext.response.charset;
        let chunks = [];
        if ((resEncode && resEncode.toLowerCase().indexOf('gb') > -1) || (charset === 'gbk')) {
            charset = 'gbk';
        } else {
            charset = 'utf-8';
        }
        let code = res.statusCode;
        httpcontext.response.statusCode = code;
        res.on('data', function (d) {
            chunks.push(d);
        });
        res.on('end', function () {
            debug('[RESPONSE] 请求响应的状态码是[%s]. 请求地址是[%s].', code, options.path);
            let data = Buffer.concat(chunks);
            data = iconv.decode(data, charset);
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
    } else {
        let headerMaps = null;
        if (httpcontext && httpcontext.request) {
            headerMaps = httpcontext.request.headers;
        }
        options = this.default_options('GET', url, headerMaps);
    }
    this.request(options, callback, httpcontext);
};
exports.post = function (url, callback, httpcontext) {
    let options = null;
    if (typeof url === 'object') {
        options = url;
    } else {
        let headerMaps = null;
        if (httpcontext && httpcontext.request) {
            headerMaps = httpcontext.request.headers;
        }
        options = this.default_options('POST', url, headerMaps);
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
    console.log('proxymodel=%s', proxy_model);
    if (!proxy_model) {
        self.select_options(httpcontext);
        self.requestp(httpcontext);
    } else if ('default' === proxy_model) {
        if (global.http_proxy) {
            httpcontext.request.proxy = global.http_proxy;
        } else {
            console.error('当proxymodel是default的时候需要设置global.http_proxy值')
        }
        self.select_options(httpcontext);
        self.requestp(httpcontext);
    } else if ('fix' === proxy_model) {
        init_httpcontext(httpcontext);
        if (httpcontext.request.proxy) {
            self.select_options(httpcontext);
            self.requestp(httpcontext);
        } else {
            if (typeof callback === 'function') {
                callback(function (httpcontext) {
                    self.select_options(httpcontext);
                    self.requestp(httpcontext);
                });
            } else {
                console.error('[ERROR-fix]requestSeleteProxy 参数 callback 不是 function. ' + callback);
            }
        }
    } else if ('dynamic' === proxy_model) {
        if (typeof callback === 'function') {
            callback(function (httpcontext) {
                self.select_options(httpcontext);
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

exports.default_options = function (method, url, headerMaps) {
    let options = {
        method: method,
        path: url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    };
    if (headerMaps) {
        let headers = this.build_headers(headerMaps);
        options.headers = headers;
    }
    return options;
};
exports.select_options = function (httpcontext) {
    let options = httpcontext.request.options;
    if (!options.headers) {
        options.headers = {};
    }
    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
    if (!options.headers['content-type']) {
        options.headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }
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
exports.build_options = function (path, method, headers) {
    let options = {
        'path': path,
        'method': method,
        'headers': headers
    };
    return options;
};
exports.build_headers = function (headerMaps) {
    let headers = {};
    if (!headers['User-Agent']) {
        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
    }
    if (!headers['content-type']) {
        headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }
    for (let key in headerMaps) {
        headers[key] = headerMaps[key];
    }
    return headers;
};


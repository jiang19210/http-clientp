const httpClient = require('../lib/http-clientp');
const assert = require('assert');
var proxy_hots = '10.211.55.13';
var port = '8888';
var proxy_url = 'http://10.211.55.13:8888';
var test_url = 'https://www.baidu.com/';

describe('httpClient', function () {
    describe('#http#get', function () {
        it('should return 200 when in test environment', function (done) {
            httpClient.get(test_url, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal(200, httpContext.response.statusCode);
                done();
            });
        });
    });
    describe('#http#get#request#timeout', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'timeout': 1000}};
            httpClient.get(test_url, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#https#get#request#proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'proxy': {'host': proxy_hots, 'port': port}}};
            httpClient.get(test_url, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#https#get#request#proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'http_proxy': proxy_url}};
            httpClient.get(test_url, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#get#httpContext#data#将请求的数据附带到结果中', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value'});
            httpClient.get(test_url, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal('value', httpContext.data.key);
                done();
            }, httpcontext);
        });
    });
    describe('#request#httpContext#data', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': test_url});
            httpClient.request(httpcontext.request.options, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal('value', httpContext.data.key);
                assert.equal(test_url, httpContext.data.url);
                done();
            }, httpcontext);
        });
    });

    describe('#request_select_proxy#httpContext#同步获取代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': test_url});
            httpcontext.proxymodel = 'dynamic';
            httpcontext.callback = function (httpcontext) {
                assert.equal(200, httpcontext.res.statusCode);
                done();
            };
            httpClient.request_select_proxy(httpcontext, function (callback) {
                var http_proxy = syncProxy();//此代理可以根据函数获取,所以为可变动的动态代理
                httpcontext.request.http_proxy = http_proxy;
                callback(httpcontext);
            });
        });
    });
    describe('#request_select_proxy#httpContext#异步获取代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': test_url});
            httpcontext.proxymodel = 'dynamic';
            httpcontext.callback = function (httpcontext) {
                assert.equal(200, httpcontext.res.statusCode);
                done();
            };
            httpClient.request_select_proxy(httpcontext, function (callback) {
                asyncProxy(function (http_proxy) {
                    httpcontext.request.http_proxy = http_proxy;
                    callback(httpcontext);
                })
            });
        });
    });

    describe('#request#headers', function () {
        it('should return 200 when in test environment', function (done) {
            var httpContext = {'request': {'headers': {"Cookie": "BAIDUID=53339F113B44CCC39F2B520C6E660F17:FG=1"}}};
            httpClient.get({'path': test_url, 'headers': {"Cookie": "BAIDUID=53339F113B44CCC39F2B520C6E660F17:FG=12"}}, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal('BAIDUID=53339F113B44CCC39F2B520C6E660F17:FG=12', httpContext.request.headers.Cookie);
                done();
            }, httpContext);
        });
    });
});

function syncProxy() {
    return proxy_url;
}

function asyncProxy(calback) {
    calback(proxy_url);
}
const httpClient = require('../lib/http-clientp');
const assert = require('assert');
describe('httpClient', function () {
    describe('#http#get', function () {
        it('should return 200 when in test environment', function (done) {
            httpClient.get('https://www.baidu.com/', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal(200, httpContext.response.statusCode);
                done();
            });
        });
    });
    describe('#http#get#request#timeout', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'timeout': 1000}};
            httpClient.get('https://www.baidu.com/', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#https#get#request#proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'proxy': {'host': '127.0.0.1', 'port': 8888}}};
            httpClient.get('https://www.baidu.com/', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#https#get#request#proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'http_proxy': 'http://127.0.0.1:8888'}};
            httpClient.get('https://www.baidu.com/', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#http#get#request#proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'proxy': {'host': '127.0.0.1', 'port': 8888}}};
            httpClient.get('http://www.dianping.com/shanghai', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#http#get#request#http_proxy#本地必须启动8888端口的代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = {'request': {'http_proxy': 'http://127.0.0.1:8888'}};
            httpClient.get('http://www.dianping.com/shanghai', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                done();
            }, httpcontext);
        });
    });
    describe('#get#httpContext#data#将请求的数据附带到结果中', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value'});
            httpClient.get('http://www.dianping.com/shanghai', function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal('value', httpContext.data.key);
                done();
            }, httpcontext);
        });
    });
    describe('#request#httpContext#data', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': 'http://doc.redisfans.com/'});
            httpClient.request(httpcontext.request.options, function (err, body, res, httpContext) {
                assert.equal(200, res.statusCode);
                assert.equal('value', httpContext.data.key);
                assert.equal('http://doc.redisfans.com/', httpContext.data.url);
                done();
            }, httpcontext);
        });
    });

    describe('#request_select_proxy#httpContext#同步获取代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': 'http://doc.redisfans.com/'});
            httpcontext.proxymodel = 'dynamic';
            httpcontext.callback = function (httpcontext) {
                assert.equal(200, httpcontext.res.statusCode);
                done();
            };
            httpClient.request_select_proxy(httpcontext, function (callback) {
                var http_proxy = syncProxy();//'http://127.0.0.1:8888';//此代理可以根据函数获取,所以为可变动的动态代理
                httpcontext.request.http_proxy = http_proxy;
                callback(httpcontext);
            });
        });
    });
    describe('#request_select_proxy#httpContext#异步获取代理', function () {
        it('should return 200 when in test environment', function (done) {
            var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': 'http://doc.redisfans.com/'});
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
});

function syncProxy() {
    return 'http://127.0.0.1:8888';
}

function asyncProxy(calback) {
    calback('http://127.0.0.1:8888');
}
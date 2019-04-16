# http-clientp
1.支持基于http和https的请求

2.支持基于http和https的代理请求

3.支持回调函数附带数据

4.支持设置超时时间

5.支持使用函数返回代理

6.具体用法见test/test.js

7.运行test请先安装mocha

8.运行test请启动本地8888端口的代理,fiddler或者charles或者其他代理都可以

****
httpcontext模板格式：
````
{
	"request":{
		"proxy":{"host":"127.0.0.1","port":8888},//设置请求代理，共两种设置方式，任选其一即可
		"http_proxy":"127.0.0.1:8888",    //设置请求代理，共两种设置方式，任选其一即可
		"headers":{},		
		"encode":true,   //是否对url进行encodeURI操作，默认为true
		"timeout":"1000", //请求超时
		"postdata":"a=1&b=1"    //post请求参数
	},
	"response":{
		"charset":"",//返回编码
		"statusCode":200
	}
}
````
*****
* 基础用法
````
var options = {
    "method":"GET",
    "path":"https://www.baidu.com/"
};
httpClient.request(options, function (err, body, res, httpContext) {
    console.log(res.statusCode)
});
****GET
var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': 'https://www.baidu.com/'}, null, {'host': '127.0.0.1', 'port': 8888}, 1000);
httpClient.request(httpcontext.request.options, function (err, body, res, httpContext) {
    console.log(res.statusCode);
    console.log(httpContext.data.key);
    console.log(httpContext.data.url);
}, httpcontext);
****POST
var httpcontext = httpClient.build_httpcontext('POST', {
    'key': 'value',
    'url': test_url
}, 'a=1&b=2&c=3', {'host': '127.0.0.1', 'port': 8888}, 1000);
httpClient.request(httpcontext.request.options, function (err, body, res, httpContext) {
    console.log(res.statusCode);
    console.log(httpContext.data.key);
    console.log(httpContext.data.url);
}, httpcontext);
````
* get请求
````
 httpClient.get('https://www.baidu.com/', function (err, body, res, httpContext) {
    console.log(res.statusCode)
 });
 ````
 * 超时请求
 ````
 var httpcontext = {'request': {'timeout': 1000}};
 httpClient.get(test_url, function (err, body, res, httpContext) {
     console.log(res.statusCode)
 }, httpcontext);
 ````
 * 代理请求
 ````
 var httpcontext = {'request': {'proxy': {'host': '127.0.0.1', 'port': 8888}}};
 httpClient.get(test_url, function (err, body, res, httpContext) {
     console.log(res.statusCode)
 }, httpcontext);
 ````
 * 代理请求，http_proxy方式
 ````
 var httpcontext = {'request': {'http_proxy': '127.0.0.1:8888'}};
 httpClient.get(test_url, function (err, body, res, httpContext) {
     console.log(res.statusCode)
 }, httpcontext);
 ````
 * 将请求的数据附带到结果中
 ````
 var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'city':'北京'});
 httpClient.get(test_url, function (err, body, res, httpContext) {
     console.log(res.statusCode)
     console.log(httpContext.data.key)
     console.log(httpContext.data.city)
 }, httpcontext);
 ````
 * 根据同步函数设置代理
 ````
 var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': test_url});
 httpcontext.proxymodel = 'dynamic';
 httpcontext.callback = function (httpcontext) {
     console.log(httpcontext.res.statusCode)
 };
 httpClient.request_select_proxy(httpcontext, function (callback) {
     var http_proxy = syncProxy();//根据函数获取代理,代理是动态获取的时候可以用此种方法
     httpcontext.request.http_proxy = http_proxy;
     callback(httpcontext);
 });
 function syncProxy() {
     return '127.0.0.1:8888';
 }
 ````
  * 根据异步函数设置代理
  ````
  var httpcontext = httpClient.build_httpcontext('GET', {'key': 'value', 'url': test_url});
  httpcontext.proxymodel = 'dynamic';
  httpcontext.callback = function (httpcontext) {
      console.log(httpcontext.res.statusCode)
  };
  httpClient.request_select_proxy(httpcontext, function (callback) {
      asyncProxy(function (http_proxy) {
          httpcontext.request.http_proxy = http_proxy;
          callback(httpcontext);
      })
  });
  function asyncProxy(calback) {
      calback(proxy_url);
  }
  ````
  * 设置头
  ````
  var httpContext = {'request': {'headers': {"Cookie": "a=a"}}};
  httpClient.get({'path': test_url, 'headers': {"Cookie": "b=b"}}, function (err, body, res, httpContext) {
      console.log(httpContext.request.headers.Cookie)
      console.log(res.statusCode)
  }, httpContext);
  ````
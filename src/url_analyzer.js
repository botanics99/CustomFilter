var UrlAnalyzer = {};
UrlAnalyzer.suggestRegExp = function (protocol, domain, path)
{
	console.log("UrlAnalyzer.suggestRegExp protocol=" + protocol + ", domain=" + domain + ", path=" + path);
	return ["RegExp0","RegExp1","RegExp2"];
};
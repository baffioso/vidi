/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2018 MapCentia ApS
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

var express = require('express');
var router = express.Router();

router.get('/locale', function(request, response) {
    var lang = request.acceptsLanguages('en', 'en-US', 'da-DK');
    if (lang) {
        if (lang === "en") {
            lang = "en-US";
        }
    } else {
        lang = "en-US";
    }
    lang = lang.replace("-","_");
    response.set('Content-Type', 'application/javascript');
    //response.send("window._vidiLocale='" + lang + "'");
    response.send("var urlVars = (function getUrlVars() {var mapvars = {};var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {mapvars[key] = value;});return mapvars;})(); if (urlVars.locale !== undefined){window._vidiLocale=urlVars.locale.split('#')[0]} else {window._vidiLocale='" + lang + "'}");
});
module.exports = router;
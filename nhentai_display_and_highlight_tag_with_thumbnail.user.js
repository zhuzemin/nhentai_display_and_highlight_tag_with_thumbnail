// ==UserScript==
// @name        nhentai Display and Highlight Tag with Thumbnail
// @namespace   nhentai_display_and_highlight_tag_with_thumbnail
// @supportURL  https://github.com/zhuzemin
// @description nHentai 显示并高亮Tag在缩略图模式
// @include     https://nhentai.net/*
// @include     https://en.nyahentai3.com/*
// @include     https://zh.nyahentai.co/*
// @include     https://ja.nyahentai.net/*
// @version     1.2
// @grant       GM_xmlhttpRequest
// @grant         GM_registerMenuCommand
// @grant         GM_setValue
// @grant         GM_getValue
// @run-at      document-start
// @author      zhuzemin
// @license     Mozilla Public License 2.0; http://www.mozilla.org/MPL/2.0/
// @license     CC Attribution-ShareAlike 4.0 International; http://creativecommons.org/licenses/by-sa/4.0/
// ==/UserScript==
var config = {
    'debug': false
}
var debug = config.debug ? console.log.bind(console)  : function () {
};

// setting User Preferences
function setUserPref(varName, defaultVal, menuText, promtText, sep){
    GM_registerMenuCommand(menuText, function() {
        var val = prompt(promtText, GM_getValue(varName, defaultVal));
        if (val === null)  { return; }  // end execution if clicked CANCEL
        // prepare string of variables separated by the separator
        if (sep && val){
            var pat1 = new RegExp('\\s*' + sep + '+\\s*', 'g'); // trim space/s around separator & trim repeated separator
            var pat2 = new RegExp('(?:^' + sep + '+|' + sep + '+$)', 'g'); // trim starting & trailing separator
            //val = val.replace(pat1, sep).replace(pat2, '');
        }
        //val = val.replace(/\s{2,}/g, ' ').trim();    // remove multiple spaces and trim
        GM_setValue(varName, val);
        // Apply changes (immediately if there are no existing highlights, or upon reload to clear the old ones)
        //if(!document.body.querySelector(".THmo")) THmo_doHighlight(document.body);
        //else location.reload();
    });
}

// prepare UserPrefs
setUserPref(
    'highlights',
    'chinese;',
    'Set Highlight Tags',
    `Set highlights, split with ";". Example: "mmf threesome; chinese"`,
    ','
);
setUserPref(
    'BlackList',
    'english;',
    'Set BlackList',
    `Set BlackList, split with ";". Example: "chinese; yaoi"`,
    ','
);


CreateStyle=function(){
    debug("Start: CreateStyle");
    var style=document.createElement("style");
    style.setAttribute("type","text/css");
    style.innerHTML=`
.glowbox {
     background: #4c4c4c; 
    //width: 400px;
    //margin: 40px 0 0 40px;
    //padding: 10px;
    -moz-box-shadow: 0 0 5px 5px #FFFF00;
    -webkit-box-shadow: 0 0 5px 5px #FFFF00;
    box-shadow: 0 0 5px 5px #FFFF00;
}
`;
    debug("Processing: CreateStyle");
    var head=document.querySelector("head");
    head.insertBefore(style,null);
    debug("End: CreateStyle");
}
class Gallery{
    constructor(href) {
        this.method = 'GET';
        this.url = href;
        this.headers = {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
            'Accept': 'application/atom+xml,application/xml,text/xml',
            'Referer': window.location.href,
        };
        this.charset = 'text/plain;charset=utf8';
    }
}
var init = function () {
    var LastDivNum=0;
    var highlights=[];
    var BlackList=[];
    try{
        highlights=GM_getValue("highlights").split(";");
        BlackList=GM_getValue("BlackList").split(";");
    }catch(e){
        debug("Not set GM_Value.");
    }
    CreateStyle();
    setInterval(function(){
        var divs = document.querySelectorAll('div.gallery');
        debug("DivNum: "+divs.length);
        if(LastDivNum<divs.length) {
            for (var i = LastDivNum; i < divs.length; ++i) {
                (function (div) {
                    div.style.maxHeight = "900px";
                    div.style.height = "900px";
                    var a = div.querySelector("a");
                    var img = a.querySelector("img");
                    var data_src=img.getAttribute("data-src");
                    img.setAttribute("src",data_src);
                    div.insertBefore(img, a);
                    a.style.overflow = "auto";
                    a.style.maxHeight = 900 - img.offsetHeight + "px";
                    var caption = a.querySelector("div.caption");
                    caption.style.position = "static";
                    var taglist = document.createElement("section");
                    taglist.setAttribute("id", "tags");
                    a.insertBefore(taglist, null);
                    var href = div.querySelector('a').href;
                    debug(href);
                    var gallery = new Gallery(href);
                    var retries = 10;
                    var request = function () {
                        GM_xmlhttpRequest({
                            method: gallery.method,
                            url: gallery.url,
                            headers: gallery.headers,
                            overrideMimeType: gallery.charset,
                            //synchronous: true
                            onload: function (responseDetails) {
                                if (responseDetails.status != 200) {
                                    // retry
                                    if (retries--) {          // *** Recurse if we still have retries
                                        setTimeout(request(),2000);
                                        return;
                                    }
                                }
                                debug(responseDetails);
                                var galleryHtml = new DOMParser().parseFromString(responseDetails.responseText, "text/html");
                                //debug(galleryHtml);
                                taglist = galleryHtml.querySelector('#tags');
                                var links = taglist.querySelectorAll("a.tag");
                                //debug(taglist);
                                for (var BlackWord of BlackList) {
                                    if (BlackWord.length > 1) {
                                        for (var highlight of highlights) {
                                            //debug("Highlight: "+highlight);
                                            if (highlight.length > 1) {
                                                for (var link of links) {
                                                    //var span=link.querySelector("span.count");
                                                    //link.removeChild(span);
                                                    var tag = link.innerText.toLowerCase().match(/([\w\s]*)/)[1].trim();
                                                    //debug("Tag: "+tag);
                                                    if (tag == BlackWord.trim()) {
                                                        div.className +=" blacklisted";
                                                        return;
                                                    }
                                                    else if (tag == highlight.trim()) {
                                                        debug("Tag: " + link.innerText);
                                                        link.className += " glowbox";
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                a.replaceChild(taglist, a.querySelector("#tags"));
                            }
                        });
                    }
                    request();
                })(divs[i]);
            }
        }
        LastDivNum=divs.length;

    }, 2000)
}
window.addEventListener('DOMContentLoaded', init);

javascript:(function(){
/* Continuum capture bookmarklet (IMP-05). The one supported bookmarklet.
 * Copies text the person can already see on this page to the clipboard. Nothing else:
 *  - no credentials, cookies, storage, hidden fields or network tokens are read;
 *  - no clicking, expanding or scrolling of the page;
 *  - no network calls; the person pastes the result into Continuum and reviews it before it is kept.
 * Prefers the current text selection; falls back to the visible page text. */
'use strict';
var MAX=12000;
var sel='';try{sel=String(window.getSelection&&window.getSelection().toString()||'').trim();}catch(e){}
var text=sel;
if(!text){try{text=String((document.body&&document.body.innerText)||'');}catch(e){}}
text=text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
var truncated=text.length>MAX;if(truncated)text=text.slice(0,MAX);
var host=location.hostname||'';
var page=(location.origin||'')+(location.pathname||'');
var title=String(document.title||'').trim().slice(0,120)||'Captured page';
var card={type:'Scrape',title:title,source:host,page:page,capturedAt:new Date().toISOString(),partial:!!sel,truncated:truncated,content:text||'(nothing visible to capture)'};
var json=JSON.stringify([card]);
function done(ok){alert('Continuum capture\nFrom: '+host+'\n'+(sel?'Selected text':'Visible page text')+', '+text.length+' characters'+(truncated?' (cut at '+MAX+')':'')+'\n'+(ok?'Copied. Paste it into Continuum to review before anything is kept.':'Copy failed. Nothing was captured.'));}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(json).then(function(){done(true);},function(){done(false);});}
else{var ta=null,ok=false;try{ta=document.createElement('textarea');ta.value=json;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');}catch(e){}try{if(ta)document.body.removeChild(ta);}catch(e){}done(ok);}
})();

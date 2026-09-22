javascript:(function(){
/* Project Continuum (Project Onion) - Phase 2 Edge Harvester v1.0
 * Zero-install scraper for Salesforce / GDP Portal.
 * Contract: relationship_model.json v0.11 L3 + GLOBAL_BRAIN 9-field schema.
 * Typed filters only. Output: 9-field array -> clipboard for PWA drop-zone.
 * Targets: apollo-123 (Acme O-008891) | novatech-42 (NovaTech O-5644421) */
'use strict';
function expandCollapsed(){
 try{
  var p=0,mx=3,re=/^(load more|show more|see more|view all|show all|expand|more details|load additional|see all)$/i,pr=/(load more|show more|see more|view all|expand)/i;
  while(p<mx){
   var c=0,a=document.querySelectorAll('[aria-expanded="false"]');
   for(var i=0;i<a.length;i++){try{a[i].click();c++;}catch(e){}}
   var b=document.querySelectorAll('button,a,[role="button"]');
   for(var j=0;j<b.length;j++){try{var t=(b[j].innerText||b[j].textContent||'').trim();if(!t)continue;if(re.test(t)||(t.length<28&&pr.test(t))){b[j].click();c++;}}catch(e){}}
   if(c===0)break;p++;
  }
 }catch(e){}
}
function djb2(s){var h=5381;for(var i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))|0;}return (h>>>0).toString(16);}
function uniq(a){var s={},o=[];for(var i=0;i<a.length;i++){if(!s[a[i]]){s[a[i]]=1;o.push(a[i]);}}return o;}
function detectSource(u,h,t){u=(u||'').toLowerCase();h=(h||'').toLowerCase();t=(t||'').toLowerCase();if(u.indexOf('/dashboard/project-details/')>-1||h.indexOf('gdp')>-1||t.indexOf('gdp')>-1)return 'GDP Portal DOM';return 'Salesforce DOM';}
function resolveProjectId(b){b=(b||'').toLowerCase();var n=b.indexOf('novatech-42')>-1||b.indexOf('novatech')>-1||b.indexOf('o-5644421')>-1||b.indexOf('payroll')>-1;var a=b.indexOf('apollo-123')>-1||b.indexOf('apollo')>-1||b.indexOf('acme')>-1||b.indexOf('o-008891')>-1||b.indexOf('furlough')>-1||b.indexOf('overrun')>-1;if(n&&!a)return 'novatech-42';if(a)return 'apollo-123';if(n)return 'novatech-42';return 'apollo-123';}
function piiScreen(raw){
 var nz=/\b(likes\s+(coffee|tea)|love\s+coffee|hotel|coffee\s+break|lunch\s+plans|weekend\s+plans|birthday|netflix|football|my\s+dog|vacation\s+photos)\b/i;
 var kp=/\b(O-?\d+|OPP?-?\d+|006[A-Za-z0-9]{15}|GDP|SoW|PO[-\s]?\d+|Apollo-123|NovaTech-42|acme\.com|novatechlabs\.com|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|furlough|overrun|payroll|milestone|phase|status|risk|issue|delivery)\b/i;
 var em=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
 var lines=String(raw||'').split(/\r?\n/),out=[],pii=false;
 for(var i=0;i<lines.length;i++){var ln=lines[i].trim();if(!ln)continue;if(em.test(ln))pii=true;if(nz.test(ln)&&!kp.test(ln))continue;if(ln.length>500)ln=ln.slice(0,500);out.push(ln);}
 var c=out.join('\n');if(c.length>4000)c=c.slice(0,4000)+'\n[truncated 4000 chars]';
 return {content:c,piiStatus:pii?'Redacted_Review':'Clean'};
}
expandCollapsed();
var url=window.location.href||'',host=window.location.hostname||'',title=(document.title||'No Title').trim();
var bodyText='';try{bodyText=document.body.innerText||document.body.textContent||'';}catch(e){}
bodyText=bodyText.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').slice(0,12000);
var opp=uniq(((url+'\n'+title+'\n'+bodyText).match(/\bO[P]{0,1}-\d+\b/g))||[]);
var oppL=uniq(((url+'\n'+bodyText).match(/\bOPP-\d+\b/g))||[]);var allOpp=uniq(opp.concat(oppL));
var gdpUrlId=(url.match(/\/dashboard\/project-details\/(\d+)/)||[])[1]||null;
var gdpIds=uniq(bodyText.match(/\b\d{4,7}\b/g)||[]).slice(0,8);
var connIds=uniq(((url+'\n'+bodyText).match(/006[A-Za-z0-9]{15}/g))||[]);
var source=detectSource(url,host,title);
var blob=(allOpp.join(' ')+' '+title+' '+bodyText.slice(0,3000));
var projectId=resolveProjectId(blob);
var sc=piiScreen(bodyText.slice(0,8000));
var head=title.slice(0,90);
if(allOpp.length>0)head+=' | '+allOpp[0];else if(gdpUrlId)head+=' | GDP '+gdpUrlId;else if(connIds.length>0)head+=' | '+connIds[0].slice(0,10)+'...';
var id='scrape-'+Date.now().toString(36)+'-'+djb2(url+'|'+head).slice(0,8);
var card={id:id,projectId:projectId,type:'Scrape',title:head,source:source,timestamp:'Just now',content:sc.content||'(empty capture)',piiStatus:sc.piiStatus,syncStatus:'pending_upload'};
var json=JSON.stringify([card]);
function done(ok){alert('Project Continuum Harvester\nSource: '+source+'\nProject: '+projectId+'\nTitle: '+head+'\nOpp: '+(allOpp.join(', ')||'none')+'\nGDP: '+(gdpUrlId||gdpIds[0]||'none')+'\nPII: '+sc.piiStatus+'\nSync: pending_upload\n'+(ok?'Copied 1 card. Paste into PWA drop-zone.':'COPY FAILED - JSON in console.'));}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(json).then(function(){done(true);},function(){console.log(json);done(false);});}
else{try{var ta=document.createElement('textarea');ta.value=json;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(ta);if(!ok)window.prompt('Copy JSON into PWA:',json);done(ok);}catch(e){console.log(json);window.prompt('Copy JSON into PWA:',json);}}
})();

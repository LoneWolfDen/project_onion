javascript:(function(){
  const url=location.href;
  const title=document.title;
  const oppId=(url.match(/Opportunity\/(006Uj[A-Za-z0-9]{15})/)||[])[1] || (url.match(/O-\d+/)||[])[0] || 'UNKNOWN';
  const details={};
  // Details tabs
  const tabs=['Prospect','Interest','Qualifying','Solutioning','Proposing','Negotiating','Closed'];
  tabs.forEach(t=>{
    const el=document.querySelector(`[title="${t}"]`)?.closest('div');
    if(el) details[t]=el.innerText.slice(0,1000);
  });
  // Notes & Attachments table
  const attachments=[];
  document.querySelectorAll('table tbody tr').forEach(tr=>{
    const cols=tr.querySelectorAll('td');
    if(cols.length>=5){
      attachments.push({
        title: cols[1]?.innerText?.trim(),
        createdBy: cols[2]?.innerText?.trim(),
        lastModified: cols[3]?.innerText?.trim(),
        size: cols[4]?.innerText?.trim(),
        link: tr.querySelector('a')?.href || url
      });
    }
  });
  // Chatter
  const chatter=[];
  document.querySelectorAll('[data-aura-class*="chatter"] .feedItem').forEach(item=>{
    chatter.push(item.innerText.slice(0,500));
  });
  const payload={
    opportunity_id: oppId,
    connected_url: url,
    title,
    captured_at: new Date().toISOString(),
    details,
    attachments: attachments.slice(0,28),
    chatter: chatter.slice(0,10),
    clip_id: btoa(url+'|'+new Date().toISOString()).slice(0,32)
  };
  console.log('Project Onion Connected Capture', payload);
  prompt('Copy this JSON and paste into Project Onion Add Reference', JSON.stringify(payload, null, 2));
})();
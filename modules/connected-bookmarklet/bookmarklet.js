javascript:(function(){
  const url = window.location.href;
  const connectedMatch = url.match(/006[A-Za-z0-9]{15}/);
  const connectedId = connectedMatch ? connectedMatch[0] : null;
  const bodyText = document.body.innerText || '';
  const fileMatch = bodyText.match(/PS-v[\w\.\-]*\((O-\d{7})\)-V[\d\.]+_?ESC/i);
  const oppMatch = bodyText.match(/O-\d{7}/) || url.match(/O-\d{7}/);
  const opportunityNumber = fileMatch ? fileMatch[1] : (oppMatch ? oppMatch[0] : null);
  const sharepointMatch = bodyText.match(/geadinspf|rrdiscovery|clienta/i);
  const sharepointSmp = sharepointMatch ? sharepointMatch[0].toLowerCase() : 'geadinspf';
  const gdpMatch = bodyText.match(/\b84\d{2}\b/);
  const gdpId = gdpMatch ? gdpMatch[0] : '8399';
  const versionMatch = bodyText.match(/V(\d+\.\d+)_?ESC/i);
  const version = versionMatch ? versionMatch[0] : 'V6.3_ESC';
  if(!connectedId){ alert('Project Onion: No ConnectedRecord 006Uj... found in URL ' + url); return; }
  const clientName = 'GE Aero';
  const projectRefName = 'GE Aero DIP Discovery';
  const anchorId = 'GEAERO-DIP-DISCOVERY';
  const payload = {
    client_name: clientName,
    project_ref_name: projectRefName,
    opportunity_numbers: opportunityNumber ? [opportunityNumber] : ['O-5030460'],
    connected_record_ids: [connectedId],
    gdp_ids: [gdpId],
    sharepoint_smps: [sharepointSmp]
  };
  const existingSharepoint = localStorage.getItem('onion_sharepoint_' + sharepointSmp);
  let proceed = true;
  if(existingSharepoint && existingSharepoint !== connectedId){
    proceed = confirm(`Found new ConnectedRecord ${connectedId} linked to same SharePoint ${sharepointSmp} - existing ${existingSharepoint} - Relevant? Yes/No/Edit - add to ${anchorId}?`);
  }
  if(!proceed) return;
  fetch('http://localhost:8000/anchor/' + encodeURIComponent(clientName) + '/' + encodeURIComponent(projectRefName), {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).then(r=>r.json()).then(data=>{
    localStorage.setItem('onion_sharepoint_' + sharepointSmp, connectedId);
    alert(`Captured\nFirst Level: ${clientName} PRIMARY FILTER\nSecond Level: ${projectRefName} ${anchorId}\nOpportunity: ${payload.opportunity_numbers.join(',')}\nConnectedRecord: ${connectedId}\nSharePoint: ${sharepointSmp}\nGDP: ${gdpId}\nVersion: ${version} deduped\nAnchor: ${data.anchor_id || anchorId}\nOpen PWA: http://localhost:8002/app`);
  }).catch(err=>{ alert('Failed to save to :8000 - is anchor running? ' + err); });
})();
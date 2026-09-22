// experience-pwa/ProjectHeader.jsx — pastel tokens, mint collapsible, freshness, multi-multi validation
import React, {useState} from 'react';

const TOKENS = {
  pastelBlue: '#D6E8FF',
  pastelBlueBorder: '#A8C6F0',
  pastelBlueText: '#1F4A7A',
  mint: '#D4EFDF',
  peach: '#FFE4D6',
  lav: '#E8DAFF',
  radius: '12px',
  shadow: '0 1px 3px rgba(0,0,0,0.06)'
};

export function ProjectHeader({anchor}){
  const [open, setOpen] = useState(true);
  // anchor = {anchor_id: 'Acme-Discovery', client_name: 'Acme UK', opportunity_ids: ['006Uj...'], project_ids: ['12345','12346'], gdp_ids: ['8399'], sharepoint_smps: ['acmespf'], freshness: '2d ago', status_indicator: 'Green'}

  const freshnessColor = anchor.freshness?.includes('2d') ? '#10B981' : anchor.freshness?.includes('Stale') ? '#EF4444' : '#F59E0B';

  return (
    <div style={{background: TOKENS.mint, borderRadius: TOKENS.radius, padding:'16px', boxShadow: TOKENS.shadow, border:`1px solid #A3D9B1`}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontSize:'12px', color:'#065F46', letterSpacing:'0.08em'}}>PROJECT REFERENCE</div>
          <div style={{fontSize:'20px', fontWeight:600, color:'#064E3B'}}>{anchor.anchor_id}</div>
          <div style={{fontSize:'13px', color:'#047857'}}>{anchor.client_name} • {anchor.opportunity_ids?.length||0} Opp • {anchor.project_ids?.length||0} ProjIDs • {anchor.gdp_ids?.length||0} GDP</div>
        </div>
        <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
          <span style={{background:'white', border:`1px solid ${freshnessColor}`, color:freshnessColor, padding:'4px 8px', borderRadius:'20px', fontSize:'11px'}}>{anchor.freshness || '2d ago'} {anchor.status_indicator||'Green'}</span>
          <button onClick={()=>setOpen(!open)} style={{background:'white', border:'1px solid #A3D9B1', borderRadius:'8px', padding:'6px 12px', fontSize:'12px'}}>{open?'Collapse':'Expand'}</button>
        </div>
      </div>

      {open && (
        <div style={{marginTop:'12px', background:'white', borderRadius:'8px', padding:'12px', fontSize:'12px'}}>
          <div style={{marginBottom:'8px'}}>
            <strong>Opportunity IDs:</strong> {anchor.opportunity_ids?.map(id=>(
              <span key={id} style={{background:TOKENS.pastelBlue, border:`1px solid ${TOKENS.pastelBlueBorder}`, color:TOKENS.pastelBlueText, padding:'2px 6px', borderRadius:'6px', marginLeft:'4px'}}>{id.slice(0,10)}...</span>
            ))}
            <span style={{marginLeft:'8px', color:'#D97706'}}>New Opportunity ID detected OPP-8893 Relevant? Yes/No/Edit</span>
          </div>
          <div style={{marginBottom:'8px'}}>
            <strong>Project IDs:</strong> {anchor.project_ids?.join(', ')} • <strong>GDP IDs:</strong> {anchor.gdp_ids?.join(', ')} • <strong>SMP:</strong> {anchor.sharepoint_smps?.join(', ')}
          </div>
          <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
            <button style={{background:TOKENS.pastelBlue, border:`1px solid ${TOKENS.pastelBlueBorder}`, color:TOKENS.pastelBlueText, borderRadius:'8px', padding:'6px 10px'}}>View Card</button>
            <button style={{background:'white', border:'1px solid #E5E7EB', borderRadius:'8px', padding:'6px 10px'}}>Client 360</button>
            <button style={{background:'white', border:'1px solid #E5E7EB', borderRadius:'8px', padding:'6px 10px'}}>Handover Pack</button>
          </div>
        </div>
      )}
    </div>
  );
}
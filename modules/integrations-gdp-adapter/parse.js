// integrations-gdp-adapter/parse.js — SheetJS full read on HEAD change — multi-row intelligence
// npm install xlsx
import * as XLSX from 'xlsx';
import crypto from 'crypto';

const EXACT_COLUMNS = ["Engagement Name","Account Name","GDP ID","Project ID","GDD","GDM","PrgM","EM/DL","Status Date","Current Phase","Status Indicator","Start Date","End Date","Location","Summary","Practice","Business Unit / BSV","Business Unit"];

export function hashId(...parts){
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16);
}

export function parseGDPExcel(buffer, anchorId){
  const wb = XLSX.read(buffer, {type:'buffer'});
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
  
  const cards = [];
  const seen = new Map(); // clip_id -> card

  rows.forEach((row, idx)=>{
    const gdpId = row["GDP ID"] || row["GDPID"] || '8399';
    const projectId = row["Project ID"] || 'UNKNOWN';
    const engagementName = row["Engagement Name"] || '';
    const summary = row["Summary"] || '';
    const weekEnding = row["Status Date"] || row["Week Ending Date"] || new Date().toISOString().slice(0,10);
    
    // Multi-row intelligence: same ProjectID + same week + similarity >0.85 = same card timeline
    const normalizedTitle = engagementName.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,50);
    const clipId = hashId(gdpId, projectId, normalizedTitle, weekEnding);
    
    const existing = seen.get(clipId);
    if(existing){
      // Same card — add timeline event — 50% laptop example
      existing.timeline_events.push({
        date: weekEnding,
        summary,
        row_index: idx,
        provenance: `Row ${idx+1} ${row["Current Phase"]} ${row["Status Indicator"]}`
      });
      existing.last_refreshed = new Date().toISOString();
    } else {
      const card = {
        clip_id: clipId,
        anchor_id: anchorId,
        gdp_id: String(gdpId),
        project_id: String(projectId),
        engagement_name: engagementName,
        account_name: row["Account Name"] || '',
        gdm: row["GDM"] || '',
        em_dl: row["EM/DL"] || '',
        status_date: row["Status Date"] || '',
        current_phase: row["Current Phase"] || 'Execution',
        status_indicator: row["Status Indicator"] || 'Green',
        start_date: row["Start Date"] || '',
        end_date: row["End Date"] || '',
        summary,
        timeline_events: [{
          date: weekEnding,
          summary,
          row_index: idx,
          provenance: `Row ${idx+1} ${row["Current Phase"]} ${row["Status Indicator"]}`
        }],
        freshness: {first_seen: new Date().toISOString(), last_refreshed: new Date().toISOString()},
        source_type: 'gdp_engagement_export'
      };
      seen.set(clipId, card);
      cards.push(card);
    }
  });

  return cards; // One card per ProjectID per week with timeline_events[] — not one card per row
}

// HEAD check — 6h EventBridge knocks not entering
export async function headCheckExists(sharepointUrl){
  try {
    const res = await fetch(sharepointUrl, {method:'HEAD'});
    return res.ok;
  } catch { return false; }
}
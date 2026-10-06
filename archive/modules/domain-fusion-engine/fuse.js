// domain-fusion-engine/fuse.js — weekly bucket + significance_score + Top5 Key Moments
// significance: 0.9-1.0 EXTENSION/EXPANSION/APPROVAL/BUDGET CHANGE/RESOURCE/STAKEHOLDER/PO, 0.5-0.8 ALIGNMENT/RISK ESCALATED, 0.0-0.4 CHASING/REMINDER/FYI

const SIGNIFICANCE_KEYWORDS = {
  high: ['extension','expansion','approved','approval','budget change','po release','sow sign off','stakeholder','resource','project id','gdp','opportunity won','closed','startup'],
  medium: ['risk','escalated','alignment','ra-id','raid','blocker','milestone','delivery'],
  low: ['chasing','reminder','fyi','follow up','just checking','any update','please confirm']
};

export function scoreSignificance(text){
  const t = text.toLowerCase();
  if(SIGNIFICANCE_KEYWORDS.high.some(k=>t.includes(k))) return 0.92;
  if(SIGNIFICANCE_KEYWORDS.medium.some(k=>t.includes(k))) return 0.65;
  if(SIGNIFICANCE_KEYWORDS.low.some(k=>t.includes(k))) return 0.25;
  return 0.5;
}

export function fuseClips(clips, anchorId){
  // clips: from connected, sharepoint, gdp, excel, email
  // Weekly bucket: same anchorId same week same type = 1 milestone
  const byWeek = new Map();
  
  clips.forEach(clip=>{
    const date = new Date(clip.date || clip.status_date || clip.lastModified || Date.now());
    const week = getWeekKey(date); // e.g., 2026-W38
    const key = `${anchorId}|${week}|${clip.source_type}`;
    
    if(!byWeek.has(key)){
      byWeek.set(key, {
        week_key: week,
        anchor_id: anchorId,
        type: clip.source_type,
        clips: [],
        significance_max: 0,
        summary: ''
      });
    }
    const bucket = byWeek.get(key);
    bucket.clips.push(clip);
    const sig = scoreSignificance(clip.summary || clip.title || '');
    bucket.significance_max = Math.max(bucket.significance_max, sig);
    if(sig > 0.5){
      bucket.summary = clip.summary || clip.title || bucket.summary;
    }
  });

  // Only keep buckets significance >0.5 for timeline — rest provenance only
  const timeline = [];
  const provenance = [];
  
  byWeek.forEach(bucket=>{
    if(bucket.significance_max > 0.5){
      timeline.push({
        week: bucket.week_key,
        summary: bucket.summary,
        type: bucket.type,
        significance: bucket.significance_max,
        provenance_count: bucket.clips.length,
        provenance: bucket.clips.map(c=>({link: c.link, date: c.date, author: c.createdBy || c.author})),
        view_card_link: `#card-${anchorId}`
      });
    } else {
      provenance.push(...bucket.clips);
    }
  });

  // Top5 Key Moments — last 5 EXTENSION/EXPANSION/APPROVAL/RESOURCE/STAKEHOLDER/PO — not follow-ups
  const keyMoments = clips
    .filter(c=> scoreSignificance(c.summary||c.title||'') >= 0.9)
    .sort((a,b)=> new Date(b.date)-new Date(a.date))
    .slice(0,5)
    .map(c=>({
      title: c.title || c.engagement_name || c.summary?.slice(0,80),
      date: c.date,
      type: c.source_type,
      link: c.link,
      view_card: `#card-${anchorId}`
    }));

  return {
    anchor_id: anchorId,
    timeline: timeline.sort((a,b)=> b.week.localeCompare(a.week)), // newest first
    key_moments_last_5: keyMoments,
    provenance_count: provenance.length,
    fusion_confidence: timeline.length >=3 ? 'High' : timeline.length>=1 ? 'Med' : 'Low', // only in expanded+admin — internal 0.92 stored separately
    fusion_confidence_internal: timeline.length>=3 ? 0.92 : 0.65
  };
}

function getWeekKey(d){
  const year = d.getFullYear();
  const oneJan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d - oneJan)/86400000) + oneJan.getDay()+1)/7);
  return `${year}-W${String(week).padStart(2,'0')}`;
}
# Generates relationship-v5/data/domainModel.js from data/seed/relationship_model.json.
# Only transcribes; shortens URLs (accuracy guardrail 5). Re-run whenever the JSON changes.
import json, re, sys
from urllib.parse import unquote
src = 'data/seed/relationship_model.json'
out = 'modules/experience-pwa/static/docs/relationship-v5/data/domainModel.js'
d = json.load(open(src))
URL = re.compile(r'https?://\S+')
def short(u):
    path = unquote(u.split('?')[0]).rstrip('/')
    parts = [p for p in path.split('/') if p]
    return '…/' + '/'.join(parts[-2:]) if len(parts) > 3 else path
def clean(s):
    return URL.sub(lambda m: short(m.group(0)), s) if isinstance(s, str) else s
nodes = []
for n in d['nodes']:
    nodes.append({
        'id': n['id'], 'label': n['label'], 'group': n['group'],
        'notes': clean(n.get('notes', '')),
        'identifiers': [clean(x) for x in n.get('primary_identifiers', [])],
        'fields': [{'name': clean(f.get('name')), 'kind': f.get('kind', ''), 'example': clean(f.get('example', ''))}
                   if isinstance(f, dict) else {'name': clean(f), 'kind': '', 'example': ''} for f in n.get('fields', [])],
        'filters': [{'key': clean(k.get('key')), 'condition': k.get('condition'), 'source': clean(k.get('source', ''))}
                    for k in n.get('filter_keywords', [])],
        'examplePath': short(n['sharepointUrl']) if n.get('sharepointUrl') else '',
    })
edges = [{'from': e['from'], 'to': e['to'], 'condition': e['condition'], 'label': clean(e.get('label', '')),
          'field': clean(e.get('field', '')), 'description': clean(e.get('description', ''))} for e in d['edges']]
body = json.dumps({'version': d['version'], 'nodes': nodes, 'edges': edges}, indent=2, ensure_ascii=False)
open(out, 'w').write(
    '// domainModel.js: GENERATED from data/seed/relationship_model.json. Do not hand-edit.\n'
    '// The page cannot fetch data/seed/ (service.py only serves static/), so the model is transcribed here.\n'
    '// URLs are shortened on purpose (scope § 11 rule 5). Regenerate: python3 modules/experience-pwa/static/docs/relationship-v5/generate_domain_model.py (from repo root).\n'
    'export const DOMAIN_MODEL = ' + body + ';\n')
print(len(nodes), 'nodes', len(edges), 'edges ->', out)

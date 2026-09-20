from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import hashlib, re, uuid
from datetime import datetime

app = FastAPI(title="Anchor Service + Registration", version="v0.12-registration-anchor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = {}  # key = client_name#anchor_id
CONNECTED_REGEX = re.compile(r'^006[A-Za-z0-9]{15}$')

def slugify(t: str) -> str:
    # v0.12: anchor_id shorter better - just project name, not repeating client name - as filtered and select client already visible
    # User provides project name after selecting client - anchor_id = short project name only
    t = t.strip()
    t = re.sub(r'[^A-Z0-9]+', '-', t.upper())
    t = re.sub(r'-+', '-', t).strip('-')
    return t[:64]  # shorter

def gen_project_reference_id(client_name: str, project_name: str) -> str:
    # Project_ReferenceID UniqueID to refer each project Card/Anchor when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs
    # Auto generated when user adds new project under Account Name - systems auto generated
    raw = f"{client_name}|{project_name}|{uuid.uuid4()}"
    return "PRJ-" + hashlib.sha256(raw.encode()).hexdigest()[:12].upper()  # PRJ- + 12 hex

class AnchorCreate(BaseModel):
    client_name: str  # Account Name from Connected screen - First Level PRIMARY FILTER dropdown NOT editable - from data/seed/clients.json - unique
    project_name: str  # Second Level - user provides after selecting client - short anchor_id only - not repeating client name
    project_ref_name: Optional[str] = None  # deprecated - use project_name
    project_ids: List[str] = []  # 99974052, 0000606071 - PRIMARY_UNIQUE - multiple allowed
    opportunity_numbers: List[str] = []  # O-5030460, O-5552629, O-908078 Extension & Expansion same GDP - SECONDARY_REF - multiple
    connected_record_ids: List[str] = []  # 006Uj00000QOBkvIAH, 007Pk00000QOA787DBC - SECONDARY_REF - multiple - 18-char regex ^006[A-Za-z0-9]{15}$
    gdp_id: Optional[str] = None  # 8399 / 0000002121 - SECONDARY_REF - unique for project but multiple project IDs Opp IDs logic still apply - parsed from GDP URL https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189
    gdp_url: Optional[str] = None  # https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189
    sharepoint_urls: Dict[str, List[str]] = {}  # {communications: [Collaboration_Plan.docx URL, Service_Reports_MBRs folder URL, Value Framework pptx URL], planning_documents: [Risk_Log.xlsx URL, ESC xlsm URL], solution_documents: [site URL, gdp URL]} - user configures SP URLs in Project Card - instead of keyword search - for hackathon excel upload but try sharepoint url configuration where user will have option to add RAID Log Sharepoint url to .xlsx file
    teams_channels: List[str] = []  # dedicated channels Pre-sales, Delivery, Closeout - user provides - couple channels to cater to relevant groups - from project_card teams_channels[] + SoW number + project_id + client domains + project tokens - filter Teams by SoW number and channel allowlist
    contacts: List[Dict] = []  # from collaboration*.docx + scan - contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not - at same time users should be able to add to keep it relevant - collapsable card at top which shows all details like project ids etc, contacts etc., all details gathered across fields
    start_date: Optional[str] = None  # 01/02/2024 - Anchor start and end dates + GDP mutable dates - DATE_RANGE condition - Extension & Expansion new Opp O-908078 same GDP - dates change over time
    end_date: Optional[str] = None  # 01/09/2027
    keywords: Dict[str, List[str]] = {}  # SoW, PO, Contract - SoW-2024-001, PO-88921 - CONTAINS condition - Anchor free but typed - filter_keywords_typed EXACT CONTAINS DOMAIN DATE_RANGE TOKEN_OVERLAP URL_CONTAINS - no free text
    client_domains: List[str] = []  # allegisgroup.com, ge.com - from Client Master Client Domains SECONDARY_REF - DOMAIN condition - From/To domains + contacts on Project details window
    project_ids_legacy: List[str] = []  # alias for project_ids
    gdp_ids: List[str] = []  # legacy - use gdp_id
    sharepoint_smps: List[str] = []  # legacy - use sharepoint_urls
    # Legacy fields for backward compat with v0.8-0.10
    project_ref_name_legacy: Optional[str] = None

def validate_connected_id(cid: str):
    cid = cid.strip()
    if not CONNECTED_REGEX.match(cid):
        if not re.match(r'^006[A-Za-z0-9]{12,15}$', cid):
            raise HTTPException(status_code=400, detail=f"Invalid ConnectedRecord {cid} - must be 18-char ^006[A-Za-z0-9]{{15}}$")
    return cid

@app.get("/")
def root():
    return {
        "service": "platform-anchor + registration",
        "status": "ok",
        "version": "v0.12-registration-anchor",
        "port": 8000,
        "cors": "allow_origins * for PWA :8002 + admin :8005",
        "registration": "v0.12 registration and anchor steps - fields to add which gives clarity",
        "client_master": "Account Name from Connected screen - First Level PRIMARY FILTER dropdown NOT editable - from data/seed/clients.json - unique",
        "project_card": "Second Level - anchor_id shorter better - just project name - Project_ReferenceID auto generated UniqueID for multiple IDs",
        "fields": {
            "client_name": "Account Name - PRIMARY_UNIQUE - EXACT - from Connected: Account Name",
            "project_name": "short anchor_id only - PRIMARY_UNIQUE - user provides after selecting client",
            "Project_ReferenceID": "PRJ- + 12 hex - auto generated when user adds new project under Account Name - UniqueID to refer each project when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs",
            "project_ids": "99974052, 0000606071 - PRIMARY_UNIQUE - multiple - EXACT condition",
            "opportunity_numbers": "O-5030460, O-5552629, O-908078 Extension & Expansion same GDP - SECONDARY_REF - EXACT",
            "connected_record_ids": "006Uj00000QOBkvIAH - 18-char ^006[A-Za-z0-9]{15}$ - SECONDARY_REF - URL_CONTAINS",
            "gdp_id": "8399 / 0000002121 - SECONDARY_REF - parsed from GDP URL /project-details/{id} - URL_CONTAINS",
            "gdp_url": "https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189",
            "sharepoint_urls": "communications: Collaboration Plan docx, MBR folder, Value Framework pptx, planning_documents: Risk Log xlsx, ESC xlsm, solution_documents: site - URL_CONTAINS - user configures SP URLs instead of keyword search - hackathon excel upload but try sharepoint url config",
            "teams_channels": "dedicated channels Pre-sales Delivery Closeout - user provides - CONTAINS + TOKEN_OVERLAP",
            "contacts": "from collaboration*.docx + scan - contacts identified from user inputs and initial scan users need to mark if relevant or not + user adds to keep relevant - collapsable card at top shows all details",
            "start_date/end_date": "01/02/2024 - 01/09/2027 - mutable Extension & Expansion new Opp same GDP - DATE_RANGE",
            "keywords": "SoW, PO, Contract - SoW-2024-001, PO-88921 - CONTAINS - Anchor free but typed - filter_keywords_typed",
            "client_domains": "allegisgroup.com, ge.com - DOMAIN condition"
        },
        "reusable_config": "Typed enum EXACT CONTAINS DOMAIN DATE_RANGE TOKEN_OVERLAP URL_CONTAINS - no free text - from data/seed/relationship_model.json v0.11 - Data as Code",
        "anti_hallucination": "Do NOT invent GDP significance - user said no formula - only fields provided in columns - DATA_DICTIONARY source of truth"
    }

@app.put("/anchor/{client_name}/{project_name}")
def create_anchor(client_name: str, project_name: str, payload: AnchorCreate):
    # v0.12: client_name from path + project_name from path = anchor_id short - not repeating client name - shorter better as filtered visible
    # Project_ReferenceID auto generated
    client_name = payload.client_name or client_name
    project_name = payload.project_name or project_name
    if not project_name:
        raise HTTPException(status_code=400, detail="project_name required - Second Level - user provides after selecting client")

    # Validate connected IDs
    payload.connected_record_ids = [validate_connected_id(cid) for cid in payload.connected_record_ids]

    # Merge legacy fields
    if payload.project_ids_legacy:
        payload.project_ids = list(set(payload.project_ids + payload.project_ids_legacy))
    if payload.gdp_ids:
        if payload.gdp_id and payload.gdp_id not in payload.gdp_ids:
            payload.gdp_ids.append(payload.gdp_id)
        elif not payload.gdp_id and payload.gdp_ids:
            payload.gdp_id = payload.gdp_ids[0]
    if payload.sharepoint_smps and not payload.sharepoint_urls:
        payload.sharepoint_urls = {"planning_documents": payload.sharepoint_smps}

    anchor_id = slugify(project_name)  # short - just project name
    key = f"{client_name}#{anchor_id}"

    # Generate Project_ReferenceID if not exists - UniqueID auto generated when user adds new project under Account Name
    existing = STORE.get(key)
    if existing and existing.get("project_reference_id"):
        project_reference_id = existing["project_reference_id"]
        first_seen = existing["freshness"]["first_seen"]
    else:
        project_reference_id = gen_project_reference_id(client_name, project_name)
        first_seen = datetime.utcnow().isoformat()

    # Parse GDP ID from URL if not provided
    gdp_id = payload.gdp_id
    if not gdp_id and payload.gdp_url:
        # Extract from /project-details/7189
        m = re.search(r'/project-details/(\d+)', payload.gdp_url)
        if m:
            gdp_id = m.group(1)

    record = {
        "client_name": client_name,  # Account Name from Connected - First Level PRIMARY FILTER dropdown NOT editable - unique
        "project_name": project_name,  # Second Level - short anchor_id only - user provides after selecting client - shorter better
        "project_ref_name": project_name,  # backward compat
        "anchor_id": anchor_id,  # short - just project name - not repeating client name
        "project_reference_id": project_reference_id,  # PRJ- + 12 hex - UniqueID to refer each project when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs - auto generated
        "project_ids": payload.project_ids,  # 99974052, 0000606071 - PRIMARY_UNIQUE - multiple - EXACT
        "opportunity_numbers": payload.opportunity_numbers,  # O-5030460, O-5552629, O-908078 - SECONDARY_REF - EXACT - Extension & Expansion same GDP
        "connected_record_ids": payload.connected_record_ids,  # 006Uj00000QOBkvIAH - 18-char - SECONDARY_REF - URL_CONTAINS
        "gdp_id": gdp_id,  # 8399 / 0000002121 - SECONDARY_REF - parsed from GDP URL
        "gdp_url": payload.gdp_url,  # https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189
        "gdp_ids": [gdp_id] if gdp_id else payload.gdp_ids,  # legacy
        "sharepoint_urls": payload.sharepoint_urls,  # communications, planning_documents, solution_documents - user configures SP URLs instead of keyword search
        "sharepoint_smps": payload.sharepoint_smps or list(payload.sharepoint_urls.get("planning_documents", [])) if payload.sharepoint_urls else [],  # legacy
        "teams_channels": payload.teams_channels,  # dedicated channels Pre-sales Delivery Closeout - user provides - CONTAINS + TOKEN_OVERLAP
        "contacts": payload.contacts,  # from collaboration*.docx + scan - contacts identified from user inputs and initial scan users need to mark if relevant or not + user adds to keep relevant - collapsable card at top
        "start_date": payload.start_date,  # 01/02/2024 - Anchor start and end dates + GDP mutable - DATE_RANGE
        "end_date": payload.end_date,  # 01/09/2027
        "keywords": payload.keywords,  # SoW, PO, Contract - CONTAINS - typed
        "client_domains": payload.client_domains,  # allegisgroup.com, ge.com - DOMAIN
        "link_table": {
            "opportunity_numbers": payload.opportunity_numbers,
            "connected_record_ids": payload.connected_record_ids,
            "project_ids": payload.project_ids,
            "gdp_id": gdp_id
        },
        "filter_conditions": {
            "EXACT": ["Account Name", "Project ID", "Opportunity ID", "GDP ID", "Thread normalized Re/Fw stripped"],
            "CONTAINS": ["Project name tokens in subject/body", "SoW/PO/Contract numbers", "RAID Type detection"],
            "DOMAIN": ["client email domains from Client Master", "attendee domains in VTT"],
            "DATE_RANGE": ["Anchor start/end", "GDP mutable dates", "last_scanned_date delta"],
            "TOKEN_OVERLAP": ["Project name split tokens vs email/Teams/chatter"],
            "URL_CONTAINS": ["GDP /project-details/{id}", "SharePoint file URLs", "Connected record ID in URL"]
        },
        "freshness": {"first_seen": first_seen, "last_refreshed": datetime.utcnow().isoformat()},
        "level_info": {"first_level": f"{client_name} PRIMARY FILTER dropdown NOT editable - Account Name from Connected unique", "second_level": f"{project_name} editable anchor_id {anchor_id} short - not repeating client name - Project_ReferenceID {project_reference_id}"}
    }
    STORE[key] = record
    return record

@app.get("/anchors/{client_name}")
def list_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "level": "First Level PRIMARY FILTER GE Aero / Client A - Account Name from Connected unique - dropdown NOT editable", "anchors": results}

@app.get("/anchor/{client_name}/{project_name}")
def get_anchor(client_name: str, project_name: str):
    anchor_id = slugify(project_name)
    key = f"{client_name}#{anchor_id}"
    if key not in STORE:
        # Try legacy lookup with full slug including client
        for k, v in STORE.items():
            if v["client_name"] == client_name and v["project_name"] == project_name:
                return v
        raise HTTPException(status_code=404, detail=f"Anchor not found {client_name}#{anchor_id} - create with PUT first - project_name short anchor_id only")
    return STORE[key]

@app.get("/search/opportunity/{opportunity_number}")
def search_opp(opportunity_number: str):
    results = [v for v in STORE.values() if opportunity_number in v.get("opportunity_numbers", [])]
    return {"opportunity_number": opportunity_number, "count": len(results), "anchors": results}

@app.get("/search/connected/{connected_record_id}")
def search_conn(connected_record_id: str):
    results = [v for v in STORE.values() if connected_record_id in v.get("connected_record_ids", [])]
    return {"connected_record_id": connected_record_id, "count": len(results), "anchors": results}

@app.get("/registration/fields")
def registration_fields():
    return {
        "client_master": {
            "field": "client_name - Account Name from Connected screen Field name Account Name - unique - First Level PRIMARY FILTER dropdown NOT editable - from data/seed/clients.json",
            "type": "PRIMARY_UNIQUE",
            "condition": "EXACT",
            "editable": False,
            "example": "Client A / GE Aero",
            "source": "data/seed/clients.json - Connected: Account Name"
        },
        "project_card": {
            "fields": [
                {"name": "project_name", "kind": "PRIMARY_UNIQUE", "condition": "EXACT", "example": "Agentic FullMigration", "notes": "Second Level - user provides after selecting client - anchor_id shorter just project name - not repeating client name as filtered visible", "required": True},
                {"name": "Project_ReferenceID", "kind": "PRIMARY_UNIQUE", "condition": "EXACT", "example": "PRJ-A1B2C3D4E5F6 - auto generated when user adds new project under Account Name - UniqueID to refer each project when multiple Project IDs Opportunity IDs connected_record_ids GDP IDs", "required": False, "auto_generated": True},
                {"name": "project_ids", "kind": "PRIMARY_UNIQUE", "condition": "EXACT", "example": "99974052, 0000606071 - multiple", "required": False, "multiple": True},
                {"name": "opportunity_numbers", "kind": "SECONDARY_REF", "condition": "EXACT", "example": "O-5030460, O-5552629, O-908078 Extension & Expansion same GDP", "multiple": True},
                {"name": "connected_record_ids", "kind": "SECONDARY_REF", "condition": "URL_CONTAINS", "example": "006Uj00000QOBkvIAH, 007Pk00000QOA787DBC - 18-char regex ^006[A-Za-z0-9]{15}$", "multiple": True},
                {"name": "gdp_id", "kind": "SECONDARY_REF", "condition": "URL_CONTAINS", "example": "8399 / 0000002121 - parsed from GDP URL /project-details/{id}", "multiple": False},
                {"name": "gdp_url", "kind": "PRIMARY_UNIQUE", "condition": "URL_CONTAINS", "example": "https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189", "required": False},
                {"name": "sharepoint_urls", "kind": "SECONDARY_REF", "condition": "URL_CONTAINS", "example": "{communications: [Collaboration_Plan.docx URL, Service_Reports_MBRs folder, Value Framework pptx], planning_documents: [Risk_Log.xlsx URL, ESC xlsm URL], solution_documents: [site URL, gdp URL]} - user configures SP URLs instead of keyword search - hackathon excel upload but try sharepoint url config", "multiple": True},
                {"name": "teams_channels", "kind": "SECONDARY_REF", "condition": "TOKEN_OVERLAP", "example": "Pre-sales, Delivery, Closeout - dedicated channels user provides - couple channels to cater to relevant groups", "multiple": True},
                {"name": "contacts", "kind": "SECONDARY_REF", "condition": "DOMAIN", "example": "from collaboration*.docx + scan - contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not + user adds to keep it relevant - collapsable card at top shows all details", "multiple": True},
                {"name": "start_date / end_date", "kind": "SECONDARY_REF", "condition": "DATE_RANGE", "example": "01/02/2024 - 01/09/2027 - mutable Extension & Expansion new Opp same GDP", "required": False},
                {"name": "keywords SoW PO Contract", "kind": "SECONDARY_REF", "condition": "CONTAINS", "example": "SoW-2024-001, PO-88921, Contract numbers - Anchor free but typed", "multiple": True},
                {"name": "client_domains", "kind": "SECONDARY_REF", "condition": "DOMAIN", "example": "allegisgroup.com, ge.com - from Client Master", "multiple": True}
            ],
            "filter_conditions_no_free_text": "Use typed enum EXACT CONTAINS DOMAIN DATE_RANGE TOKEN_OVERLAP URL_CONTAINS not free text - Each edge has condition + field + description - from data/seed/relationship_model.json v0.11 - Data as Code"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
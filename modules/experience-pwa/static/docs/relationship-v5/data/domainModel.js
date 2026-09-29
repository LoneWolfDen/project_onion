// domainModel.js: GENERATED from data/seed/relationship_model.json. Do not hand-edit.
// The page cannot fetch data/seed/ (service.py only serves static/), so the model is transcribed here.
// URLs are shortened on purpose (scope § 11 rule 5). Regenerate: python3 modules/experience-pwa/static/docs/relationship-v5/generate_domain_model.py (from repo root).
export const DOMAIN_MODEL = {
  "version": "v0.11",
  "nodes": [
    {
      "id": "client_master",
      "label": "Client Master",
      "group": "master",
      "notes": "First Level PRIMARY FILTER - dropdown from data/seed/clients.json - NOT editable - unique.",
      "identifiers": [
        "Account Name"
      ],
      "fields": [
        {
          "name": "Account Name",
          "kind": "PRIMARY_UNIQUE",
          "example": "Acme Corp / NovaTech Labs"
        },
        {
          "name": "Client Domains",
          "kind": "SECONDARY_REF",
          "example": "acme.com, novatechlabs.com"
        }
      ],
      "filters": [
        {
          "key": "Account Name",
          "condition": "EXACT",
          "source": "Connected: Account Name"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "project_card",
      "label": "Project Card / Anchor",
      "group": "anchor",
      "notes": "Second level. Anchor_id = short project name only. Already filtered by client dropdown visible. Holds all refs.",
      "identifiers": [
        "project_name (short",
        "anchor_id)",
        "Oppurtunit_id",
        "project_id"
      ],
      "fields": [
        {
          "name": "client_name",
          "kind": "FOREIGN",
          "example": "Acme Corp"
        },
        {
          "name": "project_name",
          "kind": "PRIMARY_UNIQUE",
          "example": "Agentic FullMigration"
        },
        {
          "name": "project_ids",
          "kind": "PRIMARY_UNIQUE",
          "example": "99974052, 0000606071"
        },
        {
          "name": "opportunity_ids",
          "kind": "SECONDARY_REF",
          "example": "OPP-8891, OPP-4421"
        },
        {
          "name": "connected_record_ids",
          "kind": "SECONDARY_REF",
          "example": "006Uj00000QOBkvIAH, 007Pk00000QOA787DBC"
        },
        {
          "name": "gdp_id",
          "kind": "SECONDARY_REF",
          "example": "8399 / 0000002121"
        },
        {
          "name": "sharepoint_urls[]",
          "kind": "SECONDARY_REF",
          "example": "Risk_Log.xlsx URL,Collaboration Plan, Service Reports, ESC, Value Framework"
        },
        {
          "name": "teams_channels[]",
          "kind": "SECONDARY_REF",
          "example": "Pre-sales, Delivery - Channel URLs"
        },
        {
          "name": "contacts[]",
          "kind": "SECONDARY_REF",
          "example": "from collaboration*.docx + scan"
        },
        {
          "name": "start_date / end_date",
          "kind": "SECONDARY_REF",
          "example": "01/02/2024 - 01/09/2027"
        },
        {
          "name": "keywords: SoW, PO, Contract",
          "kind": "SECONDARY_REF",
          "example": "SoW-2024-001, PO-88921"
        },
        {
          "name": "Project_ReferenceID",
          "kind": "PRIMARY_UNIQUE",
          "example": "UniqueID to refer each project Card/Anchor - systems Auto generated when user adds a new project under an Account Name. This helps to uniquely identify a project in the scenarios where a Project Card/Anchor will have multiple - Project IDs, Opportunity IDs, connected_record_ids, GDP IDs"
        },
        {
          "name": "SoW Number",
          "kind": "SECONDARY_REF",
          "example": "SoW-2024-001 - added via admin :8005 PUT /node/project_card"
        }
      ],
      "filters": [
        {
          "key": "project_id",
          "condition": "EXACT",
          "source": "Anchor"
        },
        {
          "key": "opportunity_id",
          "condition": "EXACT",
          "source": "Anchor O-xxxxx"
        },
        {
          "key": "project_name_tokens",
          "condition": "TOKEN_OVERLAP",
          "source": "Project name split"
        },
        {
          "key": "client_email_domains",
          "condition": "DOMAIN",
          "source": "Client Master"
        },
        {
          "key": "gdp_id",
          "condition": "EXACT",
          "source": "GDP URL"
        },
        {
          "key": "SoW / PO / Contract",
          "condition": "CONTAINS",
          "source": "Anchor free but typed"
        },
        {
          "key": "connected_url",
          "condition": "URL_CONTAINS",
          "source": "006... ID in URL"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "sp_comm_plan",
      "label": "SP: Collaboration Plan",
      "group": "sharepoint",
      "notes": "Path pattern: .../Communications/Collaboration_Plan.docx",
      "identifiers": [
        "SharePoint URL (docx)"
      ],
      "fields": [
        {
          "name": "Library = Communications",
          "kind": "SECONDARY_REF",
          "example": "Communications"
        },
        {
          "name": "Usage = Collaboration Plan",
          "kind": "SECONDARY_REF",
          "example": "Collaboration_Plan.docx"
        },
        {
          "name": "contacts[] (parsed)",
          "kind": "SECONDARY_REF",
          "example": "Client + Internal from docx"
        }
      ],
      "filters": [
        {
          "key": "SharePoint URL",
          "condition": "URL_CONTAINS",
          "source": "User provides URL"
        }
      ],
      "examplePath": "…/Communications/Collaboration_Plan.docx"
    },
    {
      "id": "sp_risk_log",
      "label": "SP: Risk Log (.xlsx)",
      "group": "sharepoint",
      "notes": "3 templates varying. Hackathon: accept excel upload OR SharePoint URL config. Show detected columns demo. Row = one item, multi-line mitigation.",
      "identifiers": [
        "SharePoint URL to .xlsx",
        "Sheet names: RAID, RAID Log, Log, RISK Log"
      ],
      "fields": [
        {
          "name": "Date Raised",
          "kind": "SECONDARY_REF",
          "example": "2026-03-14"
        },
        {
          "name": "RAID Type",
          "kind": "SECONDARY_REF",
          "example": "Risk, Issue, Dependency, Action..."
        },
        {
          "name": "Description",
          "kind": "SECONDARY_REF",
          "example": "Actual issue summarised"
        },
        {
          "name": "State/Comments/Mitigation",
          "kind": "SECONDARY_REF",
          "example": "multi-line updates until closed"
        },
        {
          "name": "Assigned To",
          "kind": "SECONDARY_REF",
          "example": "free text client/vendor"
        },
        {
          "name": "Status",
          "kind": "SECONDARY_REF",
          "example": "Open/In Progress/Closed"
        },
        {
          "name": "Priority/Impact (T3)",
          "kind": "SECONDARY_REF",
          "example": "High/Low/Medium/Critical"
        },
        {
          "name": "Due Date / Closed Date",
          "kind": "SECONDARY_REF",
          "example": "Target date"
        },
        {
          "name": "Type (T3)",
          "kind": "SECONDARY_REF",
          "example": "External/Internal"
        },
        {
          "name": "Knowledge Area / Category / Source (T3)",
          "kind": "SECONDARY_REF",
          "example": "Project management..."
        }
      ],
      "filters": [
        {
          "key": "Sharepoint URL (instead of name)",
          "condition": "CONTAINS",
          "source": "RAID, RAID Log, Log, RISK Log"
        },
        {
          "key": "RAID Type detection",
          "condition": "CONTAINS",
          "source": "Column header mapping, not free text"
        }
      ],
      "examplePath": "…/Planning Documents/Risk_Log_ProServe__AgenticDevelopment.xlsx"
    },
    {
      "id": "sp_esc",
      "label": "SP: ESC (.xlsm)",
      "group": "sharepoint",
      "notes": "Planning Documents / ESC. Provides Opp ID + SoW ref.",
      "identifiers": [
        "SharePoint URL to .xlsm"
      ],
      "fields": [
        {
          "name": "Opportunity ID in filename",
          "kind": "SECONDARY_REF",
          "example": "O-5552629 from PS-v2026.4..._ESC.xlsm"
        },
        {
          "name": "Project ID / Engagement",
          "kind": "SECONDARY_REF",
          "example": "Mapped via Anchor"
        }
      ],
      "filters": [
        {
          "key": "Opportunity ID from filename",
          "condition": "CONTAINS",
          "source": "Filename parsing"
        }
      ],
      "examplePath": "…/Planning Documents/PS-v2026.4-AWProServe Agentic Development (O-5552629)_ESC.xlsm"
    },
    {
      "id": "gdp_dash",
      "label": "GDP Dashboard URL",
      "group": "gdp",
      "notes": "Users give GDP URL -> we parse GDP ID. Supports multiple Project IDs & Opp IDs per same GDP on Extension.",
      "identifiers": [
        "GDP ID parsed from URL"
      ],
      "fields": [
        {
          "name": "GDP URL",
          "kind": "PRIMARY_UNIQUE",
          "example": "…/project-details/7189"
        },
        {
          "name": "GDP ID",
          "kind": "PRIMARY_UNIQUE",
          "example": "8399 / 00009764"
        },
        {
          "name": "Project ID",
          "kind": "SECONDARY_REF",
          "example": "668912"
        },
        {
          "name": "Current Phase / Status Indicator",
          "kind": "SECONDARY_REF",
          "example": "Startup/Execution/Closeout, Green/Yellow/Red"
        },
        {
          "name": "Start/End Date (mutable)",
          "kind": "SECONDARY_REF",
          "example": "GDP dates can shift on Extension"
        }
      ],
      "filters": [
        {
          "key": "GDP ID from URL path",
          "condition": "URL_CONTAINS",
          "source": "/project-details/{id}"
        }
      ],
      "examplePath": "…/project-details/7189"
    },
    {
      "id": "gdp_excel",
      "label": "GDP Weekly Excel (Delta)",
      "group": "gdp",
      "notes": "No formula/significance. Delta downloadable per week. Use for timeline + freshness.",
      "identifiers": [
        "Status Date + GDP ID"
      ],
      "fields": [
        {
          "name": "Engagement Name, Account Name, GDP ID, Project ID",
          "kind": "PRIMARY_UNIQUE",
          "example": "Apollo-123, Acme Corp, 8399, PO-12345"
        },
        {
          "name": "GDD, GDM, PrgM, EM/DL, Status Date, Phase",
          "kind": "SECONDARY_REF",
          "example": "Bill Byron, Jane Austin..."
        },
        {
          "name": "Status Indicator, Start Date, End Date, Location",
          "kind": "SECONDARY_REF",
          "example": "Green, 01/02/2024..."
        },
        {
          "name": "Summary, Practice, BU/BSV",
          "kind": "SECONDARY_REF",
          "example": "Project is BAU..."
        }
      ],
      "filters": [
        {
          "key": "Weekly Delta by Status Date",
          "condition": "DATE_RANGE",
          "source": "Status Date column"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "emails",
      "label": "Emails (Outlook)",
      "group": "comm",
      "notes": "Outlook Graph preferred. Noise high -> filter aggressively. PII: AWS Comprehend, exclude project data.",
      "identifiers": [
        "MessageId + Thread normalized (Re/Fw stripped)"
      ],
      "fields": [
        {
          "name": "Project ID / Opp ID / GDP ID in subject/body",
          "kind": "SECONDARY_REF",
          "example": "Tokens"
        },
        {
          "name": "client email domain",
          "kind": "SECONDARY_REF",
          "example": "Domain match and also contacts on Project details window(collabsable card at the top which shows all details like project ids etc, contacts etc., all details gathered across fields"
        },
        {
          "name": "contacts mapped",
          "kind": "SECONDARY_REF",
          "example": "From Anchor + collaboration docx"
        },
        {
          "name": "SoW / PO / Contract",
          "kind": "SECONDARY_REF",
          "example": "Contract numbers"
        },
        {
          "name": "Date range = Anchor start-end + GDP mutable",
          "kind": "SECONDARY_REF",
          "example": "Filter"
        },
        {
          "name": "PII screened flag",
          "kind": "SECONDARY_REF",
          "example": "Jane likes coffee -> filtered, keep names/emails"
        }
      ],
      "filters": [
        {
          "key": "Project ID tokens",
          "condition": "CONTAINS",
          "source": "Subject/body"
        },
        {
          "key": "Opportunity ID O-xxxx",
          "condition": "CONTAINS",
          "source": "Subject/body"
        },
        {
          "key": "Client domain",
          "condition": "DOMAIN",
          "source": "From/To domains"
        },
        {
          "key": "Project name tokens",
          "condition": "TOKEN_OVERLAP",
          "source": "Name split"
        },
        {
          "key": "Re/Fw stripped for thread",
          "condition": "EXACT",
          "source": "Thread grouping"
        },
        {
          "key": "Delta scan: last_scanned_date",
          "condition": "DATE_RANGE",
          "source": "Scan checkpoint"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "teams_chats",
      "label": "Teams Chats / Channels",
      "group": "comm",
      "notes": "Allow users to provide dedicated channels. Multiple projects same client -> need keywords.",
      "identifiers": [
        "Channel ID + Message ID"
      ],
      "fields": [
        {
          "name": "Dedicated channels (user provided)",
          "kind": "SECONDARY_REF",
          "example": "Pre-sales, Delivery, Closeout"
        },
        {
          "name": "Project keywords: ID, name tokens, Opp ID",
          "kind": "SECONDARY_REF",
          "example": "Same as emails"
        },
        {
          "name": "Client email domains",
          "kind": "SECONDARY_REF",
          "example": "Participant filter"
        }
      ],
      "filters": [
        {
          "key": "Channel allowlist",
          "condition": "EXACT",
          "source": "User config"
        },
        {
          "key": "Project tokens in message",
          "condition": "TOKEN_OVERLAP",
          "source": "Content"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "teams_vtt",
      "label": "Teams VTTs (Transcripts)",
      "group": "comm",
      "notes": "Video Text Transcripts. Few channels. Use keywords + contacts + dates.",
      "identifiers": [
        "Meeting ID + VTT timestamp"
      ],
      "fields": [
        {
          "name": "VTT text",
          "kind": "SECONDARY_REF",
          "example": "Transcript chunks"
        },
        {
          "name": "Attendees -> contacts overlap",
          "kind": "SECONDARY_REF",
          "example": "Email domains + contacts"
        }
      ],
      "filters": [
        {
          "key": "Attendee email domain match",
          "condition": "DOMAIN",
          "source": "Meeting participants"
        },
        {
          "key": "Project ID / Opp ID spoken",
          "condition": "CONTAINS",
          "source": "Transcript search"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "connected",
      "label": "Connected Chatter (Opp)",
      "group": "connected",
      "notes": "Free text, no format. All posts on Opp record are relevant to that Opp ID.",
      "identifiers": [
        "Opportunity ID O-986754 + Chatter ID"
      ],
      "fields": [
        {
          "name": "Opportunity ID = all related",
          "kind": "PRIMARY_UNIQUE",
          "example": "O-986754"
        },
        {
          "name": "Free text chatter",
          "kind": "SECONDARY_REF",
          "example": "Anything posted on linked Opp record(s)"
        },
        {
          "name": "Related IDs in Anchor updates",
          "kind": "SECONDARY_REF",
          "example": "Project IDs, GDP IDs"
        }
      ],
      "filters": [
        {
          "key": "Opportunity ID",
          "condition": "EXACT",
          "source": "Record context - no extra filter needed"
        },
        {
          "key": "Related IDs extraction",
          "condition": "CONTAINS",
          "source": "Anchor section free text parsing"
        }
      ],
      "examplePath": ""
    },
    {
      "id": "raid_agg",
      "label": "RAID Aggregated Cards",
      "group": "anchor",
      "notes": "Laptop example: dont aggregate complex items. Show cards, not complicated join. Freshness indicator per card.",
      "identifiers": [
        "Card ID = hash(sources + description_norm)"
      ],
      "fields": [
        {
          "name": "Aggregated from 5 sources",
          "kind": "SECONDARY_REF",
          "example": "SP Risk Log + GDP + Emails + Teams + Connected"
        },
        {
          "name": "LLM assessed, not static format",
          "kind": "SECONDARY_REF",
          "example": "Multiple cards if multiple line items"
        },
        {
          "name": "Sources linked (multi-row hash)",
          "kind": "SECONDARY_REF",
          "example": "Which rows contributed"
        },
        {
          "name": "Noise filter flag",
          "kind": "SECONDARY_REF",
          "example": "Low for GDP/SP, High for Email/Teams/Chatter"
        },
        {
          "name": "Freshness = card refreshed at",
          "kind": "SECONDARY_REF",
          "example": "Aggregated level timestamp"
        }
      ],
      "filters": [
        {
          "key": "Source lineage",
          "condition": "EXACT",
          "source": "Traceability"
        },
        {
          "key": "Dedup hash",
          "condition": "EXACT",
          "source": "Description normalized"
        }
      ],
      "examplePath": ""
    }
  ],
  "edges": [
    {
      "from": "client_master",
      "to": "project_card",
      "condition": "EXACT",
      "label": "filters",
      "field": "Account Name -> client_name",
      "description": "Client Master is primary dropdown. Filters project cards. No edit."
    },
    {
      "from": "project_card",
      "to": "sp_comm_plan",
      "condition": "URL_CONTAINS",
      "label": "provides URL",
      "field": "sharepoint_urls[] contains docx URL",
      "description": "User configures SP URLs in Project Card. Collaboration_Plan.docx -> contacts."
    },
    {
      "from": "project_card",
      "to": "sp_risk_log",
      "condition": "URL_CONTAINS",
      "label": "provides URL",
      "field": "sharepoint_urls[] contains .xlsx URL",
      "description": "RAID Log SharePoint URL to .xlsx. 3 templates, sheets RAID/Log/RISK Log."
    },
    {
      "from": "project_card",
      "to": "sp_esc",
      "condition": "CONTAINS",
      "label": "provides URL + parses Opp",
      "field": "sharepoint_urls[] + filename O-xxxxx",
      "description": "ESC .xlsm filename contains Opportunity ID O-5552629."
    },
    {
      "from": "project_card",
      "to": "gdp_dash",
      "condition": "URL_CONTAINS",
      "label": "GDP ID from URL",
      "field": "gdp_id parsed from GDP URL",
      "description": "User gives GDP URL …/project-details/7189 -> parse 7189/8399."
    },
    {
      "from": "project_card",
      "to": "gdp_excel",
      "condition": "EXACT",
      "label": "Project ID + dates",
      "field": "project_id + start/end dates",
      "description": "GDP Excel: Engagement Name, GDP ID, Project ID mapping. Dates mutable."
    },
    {
      "from": "project_card",
      "to": "emails",
      "condition": "CONTAINS",
      "label": "filter: IDs + domain + tokens + dates",
      "field": "project_id, Opp IDs, client domains, SoW/PO/Contract, keywords, start-end",
      "description": "Limit sources: Project IDs, client domains, contacts, keywords, SoW/PO/Contract, start/end. Delta scan."
    },
    {
      "from": "project_card",
      "to": "teams_vtt",
      "condition": "DOMAIN",
      "label": "attendees + keywords",
      "field": "contacts + project tokens + dates",
      "description": "VTTs: combination of keywords, project ID, linked client email ids."
    },
    {
      "from": "project_card",
      "to": "connected",
      "condition": "EXACT",
      "label": "Opp IDs linkage",
      "field": "opportunity_ids[] + connected_record_ids",
      "description": "Chatter free text, all posts on Opp record related to O-986754. Also parse related IDs from Anchor updates."
    },
    {
      "from": "sp_risk_log",
      "to": "raid_agg",
      "condition": "CONTAINS",
      "label": "RAID source",
      "field": "Date Raised, RAID Type, Description, Mitigation",
      "description": "Primary structured RAID. One row = one item, multi-line updates."
    },
    {
      "from": "gdp_excel",
      "to": "raid_agg",
      "condition": "TOKEN_OVERLAP",
      "label": "summary risks",
      "field": "Summary + Status Indicator + Phase",
      "description": "GDP Summary may contain risks/issues. Low noise, event driven."
    },
    {
      "from": "emails",
      "to": "raid_agg",
      "condition": "CONTAINS",
      "label": "noisy signals",
      "field": "Subject/body contains Risk/Issue tokens",
      "description": "High noise. Filter + PII screen (personal likes/hotel). Exclude Re/Fw for threads."
    },
    {
      "from": "teams_chats",
      "to": "raid_agg",
      "condition": "TOKEN_OVERLAP",
      "label": "chat signals",
      "field": "Project keywords + channel",
      "description": "Noise primary on Teams. Use channel allowlist + keywords."
    },
    {
      "from": "connected",
      "to": "raid_agg",
      "condition": "EXACT",
      "label": "chatter signals",
      "field": "Opportunity ID context",
      "description": "Free text chatter, all related to Opp ID. Noise filter."
    },
    {
      "from": "sp_comm_plan",
      "to": "project_card",
      "condition": "EXACT",
      "label": "feeds contacts",
      "field": "contacts[] from docx",
      "description": "Collaboration Plan docx parsed for contacts, user marks relevant/not."
    },
    {
      "from": "gdp_dash",
      "to": "project_card",
      "condition": "DATE_RANGE",
      "label": "dates mutable",
      "field": "Start/End dates + same GDP multi Opp IDs",
      "description": "Extension & Expansion: new O-908078 but same GDP. Dates change over time."
    },
    {
      "from": "project_card",
      "to": "teams_chats",
      "condition": "CONTAINS",
      "label": "SoW + channel + IDs + domain + tokens + dates",
      "field": "teams_channels[] + SoW number + project_id + client domains + project tokens",
      "description": "Filter Teams by SoW number + channel allowlist + Project IDs + client domains + keywords + start-end dates - admin upsert via PUT /edge - typed CONTAINS - no free text - limit sources"
    }
  ]
};

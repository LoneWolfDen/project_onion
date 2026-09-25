import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from store import vector_store
import json

# Base mock cards from the existing seed data
MOCK_CARDS = [
    {
        "id": "seed-m1",
        "author": "Daniel",
        "client": "Acme Corp",
        "project": "Apollo-123",
        "projectId": "apollo-123",
        "Project_ReferenceID": "Apollo-O-008891-200926120000",
        "opportunity_id": "O-008891",
        "type": "Excel",
        "title": "PO Extension Approved",
        "synthesizedText": "MS3 extended Q2-Q3 signed",
        "detail": "MS3 extended Q2-Q3 signed",
        "content": "MS3 extended Q2-Q3 signed",
        "source": "GDP Status",
        "timestamp": "Just now",
        "piiStatus": "Clean",
        "privacy": "Team Shared",
        "syncStatus": "synced",
        "impactScore": 0.85,
        "tags": ["#Milestone_Tracked"],
        "created_at": "2026-09-20T12:15:00.000Z"
    },
    {
        "id": "seed-wow-invoice-01",
        "author": "Daniel",
        "client": "Acme Corp",
        "project": "Apollo-123",
        "projectId": "apollo-123",
        "Project_ReferenceID": "Apollo-O-008891-200926120000",
        "opportunity_id": "O-008891",
        "type": "Email",
        "title": "Missing PO — Invoicing Resolution",
        "synthesizedText": "Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.",
        "detail": "Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.",
        "content": "Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.",
        "source": "Outlook Mail",
        "timestamp": "Just now",
        "piiStatus": "Clean",
        "privacy": "Team Shared",
        "syncStatus": "synced",
        "impactScore": 0.86,
        "tags": ["#Milestone_Tracked"],
        "created_at": "2026-09-20T12:15:00.000Z"
    }
]

# Additional mock cards to complete the set
MOCK_CARDS.extend([
    {
        "id": "novatech-malcolm-shared-01",
        "author": "Malcolm",
        "client": "NovaTech Labs",
        "project": "NovaTech-42",
        "projectId": "novatech-42",
        "Project_ReferenceID": "NovaTech-O-5644421-200926120001",
        "opportunity_id": "O-5644421",
        "type": "Chat",
        "title": "Sprint blockers — payroll logic",
        "synthesizedText": "Payroll logic migration blocked; needs delivery unblock.",
        "detail": "Sprint blocked on payroll logic migration",
        "content": "Teams #novatech-delivery: payroll logic migration blocked pending delivery review. Sprint velocity at risk. Opp O-5644421.",
        "source": "Teams Chat",
        "timestamp": "Just now",
        "piiStatus": "Clean",
        "privacy": "Team Shared",
        "syncStatus": "synced",
        "impactScore": 0.81,
        "tags": ["#Risk_Watch"],
        "created_at": "2026-09-20T12:15:00.000Z"
    },
    {
        "id": "novatech-daniel-shared-01",
        "author": "Daniel",
        "client": "NovaTech Labs",
        "project": "NovaTech-42",
        "projectId": "novatech-42",
        "Project_ReferenceID": "NovaTech-O-5644421-200926120001",
        "opportunity_id": "O-5644421",
        "type": "Email",
        "title": "PO extension — milestone billing",
        "synthesizedText": "Milestone billing PO extension requested for Phase2.",
        "detail": "PO extension requested for Phase2 milestone billing",
        "content": "Subject: Phase2 milestone billing // NovaTech-42 Opp O-5644421 // PO extension requested for Phase2 milestone per contract terms.",
        "source": "Outlook Mail",
        "timestamp": "Just now",
        "piiStatus": "Clean",
        "privacy": "Team Shared",
        "syncStatus": "synced",
        "impactScore": 0.84,
        "tags": ["#Invoice_Resolved"],
        "created_at": "2026-09-20T12:15:00.000Z"
    }
])

def seed_vector_store():
    """Seed the vector store with synthetic cards"""
    print("Seeding vector store with baseline cards...")
    
    indexed_count = 0
    for card in MOCK_CARDS:
        try:
            card_id = vector_store.ingest_card(card)
            print(f"Indexed card: {card_id} - {card['title']}")
            indexed_count += 1
        except Exception as e:
            print(f"Error indexing card {card.get('id', 'unknown')}: {str(e)}")
    
    print(f"Successfully indexed {indexed_count} documents.")
    return indexed_count

if __name__ == "__main__":
    seed_vector_store()
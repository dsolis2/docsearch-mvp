#!/usr/bin/env python3
"""
Simple REST-based script to seed Weaviate with demo data.
"""

import requests
import json

# Sample documents for demo
DEMO_DOCUMENTS = [
    {
        "id": "doc_1",
        "title": "AI Guide: Introduction to Machine Learning",
        "content": "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. Key concepts include supervised learning, unsupervised learning, and reinforcement learning. Popular algorithms include linear regression, decision trees, neural networks, and support vector machines.",
        "source": "AI_Guide.pdf",
        "page": 1,
        "document_type": "pdf"
    },
    {
        "id": "doc_2", 
        "title": "Python Development Best Practices",
        "content": "Python development follows PEP 8 style guidelines. Key practices include using virtual environments, writing comprehensive tests, following the DRY principle, and using type hints. Popular frameworks include Django for web development, FastAPI for APIs, and PyTest for testing.",
        "source": "Python_Best_Practices.md",
        "page": 1,
        "document_type": "markdown"
    },
    {
        "id": "doc_3",
        "title": "RAG Systems Architecture",
        "content": "Retrieval-Augmented Generation (RAG) combines retrieval and generation to answer questions using external knowledge. The system retrieves relevant documents from a vector database, then uses a language model to generate responses based on retrieved context. Key components include embeddings, vector search, and prompt engineering.",
        "source": "RAG_Architecture.pdf", 
        "page": 3,
        "document_type": "pdf"
    },
    {
        "id": "doc_4",
        "title": "WebSocket Real-time Communication",
        "content": "WebSocket provides full-duplex communication between client and server. It's ideal for real-time applications like chat systems, live updates, and streaming data. The protocol starts with an HTTP handshake then upgrades to WebSocket for persistent connection.",
        "source": "WebSocket_Guide.md",
        "page": 1, 
        "document_type": "markdown"
    }
]

def seed_weaviate_rest():
    """Seed Weaviate using REST API"""
    base_url = "http://localhost:8080/v1"
    
    try:
        # Check connection
        response = requests.get(f"{base_url}/meta")
        if response.status_code != 200:
            print("❌ Cannot connect to Weaviate")
            return False
        print("🔗 Connected to Weaviate")
        
        # Delete existing class if exists
        try:
            requests.delete(f"{base_url}/schema/Document")
            print("🗑️  Deleted existing Document class")
        except:
            pass
        
        # Create schema
        schema = {
            "class": "Document",
            "description": "A document chunk for RAG",
            "properties": [
                {"name": "content", "dataType": ["text"]},
                {"name": "title", "dataType": ["text"]}, 
                {"name": "source", "dataType": ["text"]},
                {"name": "page", "dataType": ["int"]},
                {"name": "document_type", "dataType": ["text"]},
                {"name": "document_id", "dataType": ["text"]}
            ]
        }
        
        response = requests.post(f"{base_url}/schema", json=schema)
        if response.status_code == 200:
            print("📋 Created Document schema")
        else:
            print(f"⚠️  Schema creation response: {response.status_code}")
        
        # Add documents
        for doc in DEMO_DOCUMENTS:
            data_object = {
                "class": "Document",
                "properties": {
                    "content": doc["content"],
                    "title": doc["title"],
                    "source": doc["source"],
                    "page": doc["page"],
                    "document_type": doc["document_type"],
                    "document_id": doc["id"]
                }
            }
            
            response = requests.post(f"{base_url}/objects", json=data_object)
            if response.status_code not in [200, 201]:
                print(f"⚠️  Failed to add document {doc['id']}: {response.status_code}")
        
        print(f"📄 Added {len(DEMO_DOCUMENTS)} documents to Weaviate")
        
        # Verify data
        response = requests.get(f"{base_url}/objects?class=Document")
        if response.status_code == 200:
            objects = response.json().get("objects", [])
            print(f"✅ Verified: {len(objects)} documents in database")
        
        return True
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        return False

if __name__ == "__main__":
    print("🌱 Seeding Weaviate with demo data (REST API)...")
    if seed_weaviate_rest():
        print("✅ Demo data seeded successfully!")
        print("\n🚀 Ready to start the RAG chat demo!")
    else:
        print("❌ Failed to seed demo data")
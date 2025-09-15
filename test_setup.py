#!/usr/bin/env python3
"""
Test script to verify the ingestion pipeline setup.

This script tests:
1. Database connection and schema
2. Required Python packages
3. Environment variables (if provided)
"""

import sys
from pathlib import Path

def test_database():
    """Test PostgreSQL connection and schema."""
    print("🔍 Testing database connection...")
    
    try:
        import psycopg
        from pgvector.psycopg import register_vector
        
        # Connect to database
        conn = psycopg.connect("postgresql://localhost/docsearch_rag")
        register_vector(conn)
        
        with conn.cursor() as cur:
            # Check if pgvector extension is enabled
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
            if not cur.fetchone():
                print("❌ pgvector extension not found")
                return False
                
            # Check if our tables exist
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('documents', 'chunks', 'embeddings');
            """)
            tables = [row[0] for row in cur.fetchall()]
            
            expected_tables = {'documents', 'chunks', 'embeddings'}
            if not expected_tables.issubset(set(tables)):
                missing = expected_tables - set(tables)
                print(f"❌ Missing tables: {missing}")
                return False
            
            # Check embeddings table dimension
            cur.execute("""
                SELECT column_name, data_type, character_maximum_length 
                FROM information_schema.columns 
                WHERE table_name = 'embeddings' AND column_name = 'embedding';
            """)
            embedding_col = cur.fetchone()
            if not embedding_col:
                print("❌ Embedding column not found")
                return False
                
            print("✅ Database connection and schema OK")
            print(f"   - pgvector extension: enabled")
            print(f"   - Tables: {', '.join(sorted(tables))}")
            print(f"   - Embedding column: {embedding_col[1]}")
            return True
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()


def test_python_packages():
    """Test required Python packages."""
    print("\n🔍 Testing Python packages...")
    
    required_packages = [
        ('google.oauth2.credentials', 'Google API'),
        ('googleapiclient.discovery', 'Google API Client'),
        ('markitdown', 'MarkItDown'),
        ('voyageai', 'VoyageAI'),
        ('psycopg', 'PostgreSQL adapter'),
        ('pgvector.psycopg', 'pgvector'),
        ('pydantic', 'Pydantic'),
        ('tenacity', 'Tenacity'),
        ('tqdm', 'Progress bars'),
    ]
    
    optional_packages = [
        ('chonkie', 'Chonkie (smart chunking)'),
        ('tiktoken', 'TikToken (token counting)'),
    ]
    
    all_good = True
    
    for package, description in required_packages:
        try:
            __import__(package)
            print(f"✅ {description}")
        except ImportError as e:
            print(f"❌ {description}: {e}")
            all_good = False
    
    for package, description in optional_packages:
        try:
            __import__(package)
            print(f"✅ {description} (optional)")
        except ImportError:
            print(f"⚠️  {description} (optional): not installed")
    
    return all_good


def test_env_vars():
    """Test environment variables if available."""
    print("\n🔍 Testing environment variables...")
    
    import os
    from dotenv import load_dotenv
    
    # Try to load .env file
    env_file = Path('.env')
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ Loaded environment from {env_file}")
    else:
        print("ℹ️  No .env file found, checking system environment")
    
    required_vars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET', 
        'GOOGLE_REFRESH_TOKEN',
        'VOYAGE_API_KEY'
    ]
    
    optional_vars = [
        'DATABASE_URL',
        'EMBEDDING_MODEL',
        'CHUNK_SIZE',
        'LOG_LEVEL'
    ]
    
    all_good = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            masked_value = value[:8] + "..." if len(value) > 8 else "***"
            print(f"✅ {var}: {masked_value}")
        else:
            print(f"❌ {var}: not set")
            all_good = False
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: using default")
    
    return all_good


def test_ingestion_script():
    """Test the ingestion script syntax."""
    print("\n🔍 Testing ingestion script...")
    
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, 'ingest_gdrive.py', '--help'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✅ Ingestion script syntax OK")
            return True
        else:
            print(f"❌ Script failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Script test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Testing RAG Ingestion Pipeline Setup")
    print("=" * 50)
    
    tests = [
        ("Database", test_database),
        ("Python Packages", test_python_packages),
        ("Environment Variables", test_env_vars),
        ("Ingestion Script", test_ingestion_script),
    ]
    
    results = {}
    for name, test_func in tests:
        results[name] = test_func()
    
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    
    all_passed = True
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All tests passed! Ready to run ingestion.")
        print("\nNext steps:")
        print("1. Set up your environment variables in .env file")
        print("2. Run: python ingest_gdrive.py --dry-run")
        print("3. Run: python ingest_gdrive.py --max-files 2")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
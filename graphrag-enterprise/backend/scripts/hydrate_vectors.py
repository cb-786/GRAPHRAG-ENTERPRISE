import asyncio
import sys
import logging
from pathlib import Path

# Adjust path to import from 'app' when running as a standalone script
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.llm import llm_service
from app.services.neo4j_service import neo4j_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

async def main():
    print("Waiting for Neo4j Bolt port to open...")
    
    # ── Robust Connection Retry Loop ──
    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            await neo4j_service.connect()
            print("Successfully connected to Neo4j!")
            break
        except Exception as e:
            if attempt == max_retries:
                print(f"Failed to connect after {max_retries} attempts. Giving up.")
                raise e
            print(f"Database not fully ready (Attempt {attempt}/{max_retries}). Waiting 5 seconds...")
            await asyncio.sleep(5)
    # ──────────────────────────────────

    print("Fetching Activity nodes without embeddings...")
    nodes = await neo4j_service.get_activities_without_embeddings()
    total = len(nodes)
    
    if total == 0:
        print("All nodes already have embeddings or the database is empty. Exiting.")
        await neo4j_service.disconnect()
        return

    print(f"Generating embeddings for {total} nodes. Respecting API limits...")
    
    for idx, node in enumerate(nodes, 1):
        try:
            text_to_embed = node.get("name")
            if not text_to_embed:
                continue

            vector = await llm_service.generate_embedding(text_to_embed)
            await neo4j_service.update_activity_embedding(node['id'], vector)
            
            if idx % 50 == 0:
                print(f"Processed {idx}/{total} embeddings...")
                
        except Exception as e:
            print(f"Error processing node {node['id']}: {e}")
            await asyncio.sleep(2) 

    print("Embedding generation complete.")
    await neo4j_service.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
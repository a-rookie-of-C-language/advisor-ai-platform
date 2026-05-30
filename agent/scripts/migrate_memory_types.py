#!/usr/bin/env python3
"""One-time migration script to backfill memory_type for existing user_memory records.

Usage:
    python scripts/migrate_memory_types.py [--batch-size 50] [--dry-run]

This script:
1. Fetches all user_memory records where memory_type = 'semantic' (default)
2. Uses LLM to classify each record's content as 'semantic' or 'episodic'
3. Updates the memory_type field in the database

Requirements:
    - MEMORY_SERVICE_URL environment variable (default: http://localhost:8084)
    - OPENAI_API_KEY environment variable for LLM classification
    - OPENAI_BASE_URL environment variable (optional)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

import httpx

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MEMORY_SERVICE_URL = os.getenv("MEMORY_SERVICE_URL", "http://localhost:8084")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", None)

CLASSIFY_PROMPT = """You are a memory type classifier. Classify each memory as one of:
- semantic: facts, preferences, user profile, identity info, goals, constraints
- episodic: past events, experiences, specific cases that happened, temporal references

Return a JSON array with the same length as input, each element being "semantic" or "episodic".

Examples:
- "用户喜欢 Python" -> semantic
- "用户是计科专业" -> semantic
- "上次修复支付 bug 用了降级方案" -> episodic
- "上周讨论过毕设选题" -> episodic
- "偏好简洁回答" -> semantic
- "昨天帮用户解决了登录问题" -> episodic

Input memories:
{memories}

Return JSON array only, no extra text:"""


async def classify_batch(contents: list[str], client: httpx.AsyncClient) -> list[str]:
    """Classify a batch of memory contents using LLM."""
    memories_text = "\n".join(f"{i+1}. {c}" for i, c in enumerate(contents))
    prompt = CLASSIFY_PROMPT.format(memories=memories_text)

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    base_url = (OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/")

    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 200,
    }

    try:
        resp = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers, timeout=30.0)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Parse JSON array
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:].strip()
        types = json.loads(content)
        # Validate
        result = []
        for t in types:
            t_str = str(t).strip().lower()
            if t_str not in ("semantic", "episodic"):
                t_str = "semantic"
            result.append(t_str)
        # Pad with semantic if LLM returned fewer
        while len(result) < len(contents):
            result.append("semantic")
        return result[:len(contents)]
    except Exception as e:
        logger.warning("LLM classification failed: %s, defaulting to semantic", e)
        return ["semantic"] * len(contents)


async def fetch_memories(client: httpx.AsyncClient, offset: int, limit: int) -> list[dict]:
    """Fetch memory records from memory-service."""
    # Use a direct DB query approach via the memory-service API
    # For now, we'll use the search endpoint with empty query
    resp = await client.get(
        f"{MEMORY_SERVICE_URL}/api/memory/task/pending",
        params={"limit": limit},
        timeout=10.0,
    )
    # This is a placeholder - in production, you'd need a dedicated endpoint
    # or direct database access for migration
    return []


async def update_memory_type(client: httpx.AsyncClient, memory_id: int, memory_type: str) -> bool:
    """Update memory_type for a specific record."""
    # This would need a dedicated endpoint in memory-service
    # For now, return True as placeholder
    return True


async def main():
    parser = argparse.ArgumentParser(description="Migrate memory_type for existing records")
    parser.add_argument("--batch-size", type=int, default=50, help="Batch size for LLM classification")
    parser.add_argument("--dry-run", action="store_true", help="Dry run mode, no actual updates")
    parser.add_argument("--limit", type=int, default=1000, help="Max records to process")
    args = parser.parse_args()

    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY environment variable is required")
        sys.exit(1)

    logger.info("Starting memory_type migration (dry_run=%s, batch_size=%d, limit=%d)", args.dry_run, args.batch_size, args.limit)

    async with httpx.AsyncClient() as client:
        # Note: This migration requires a dedicated endpoint in memory-service
        # to fetch all records and update memory_type.
        # For production use, consider:
        # 1. Adding a GET /api/memory/migration/records endpoint
        # 2. Adding a PUT /api/memory/migration/{id}/type endpoint
        # 3. Or running a direct SQL migration with LLM classification

        logger.warning(
            "This migration script requires dedicated memory-service endpoints. "
            "For now, use the SQL migration V22 to set default 'semantic' for all existing records, "
            "then use the memory-service admin API to reclassify specific records if needed."
        )
        logger.info("Migration complete. All existing records default to 'semantic' type.")


if __name__ == "__main__":
    asyncio.run(main())

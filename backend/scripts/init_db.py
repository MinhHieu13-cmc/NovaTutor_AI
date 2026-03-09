#!/usr/bin/env python3
"""
Database initialization script for NovaTutor AI
Creates tables and enables pgvector extension
"""

import asyncio
import os
from app.core.config import settings
from app.infrastructure.database.connection import create_tables, engine

async def init_database():
    """Initialize database with required extensions and tables"""
    print("Initializing database...")

    # Enable pgvector extension
    async with engine.begin() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        print("✓ pgvector extension enabled")

    # Create tables
    await create_tables()
    print("✓ Tables created")

    print("Database initialization complete!")

if __name__ == "__main__":
    asyncio.run(init_database())

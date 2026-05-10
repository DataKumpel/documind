# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "asyncpg",
#     "sqlalchemy",
# ]
# ///
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_db():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/documind')
    async with engine.connect() as conn:
        try:
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
            tables = result.fetchall()
            print("Tables:", tables)
        except Exception as e:
            print("Error:", e)

asyncio.run(test_db())

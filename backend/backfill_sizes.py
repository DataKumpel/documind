import asyncio
import os
from sqlmodel import select
from app.database import async_session
from app.models.document import Document

async def main():
    async with async_session() as session:
        result = await session.execute(select(Document))
        docs = result.scalars().all()
        for doc in docs:
            if os.path.exists(doc.filepath):
                doc.file_size = os.path.getsize(doc.filepath)
                print(f"Updated {doc.id} to {doc.file_size} bytes")
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())

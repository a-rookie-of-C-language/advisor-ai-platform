import asyncio
import logging
import os
from dotenv import load_dotenv

from RAG.DocumentIndexer import DocumentIndexer

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    db_dsn = os.environ["DATABASE_URL"]

    indexer = DocumentIndexer(db_dsn=db_dsn)
    logger.info("Agent 启动，等待文档索引任务...")
    asyncio.run(indexer.listen())


if __name__ == "__main__":
    main()

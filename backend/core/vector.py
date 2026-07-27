import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY_IMPL"] = "none"

import chromadb
from chromadb.utils import embedding_functions
from core.embedding import Embaddings
from utils.logger import Logger


COLLECTION_NAME = "health_knowledge"


class MistralEmbeddingWrapper(embedding_functions.EmbeddingFunction):
    """Wraps our Embaddings class so Chroma can call it internally."""
    def __init__(self, embed_instance: Embaddings):
        self.embed_instance = embed_instance

    def __call__(self, input: list) -> list:
        return self.embed_instance.create_embeddings(input)


class VectorStore:
    def __init__(self, persist_dir: str = "chroma_db"):
        self.logger = Logger()
        self.log = self.logger.get_logger()
        self.embeddings = Embaddings()

        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=MistralEmbeddingWrapper(self.embeddings),
        metadata={"hnsw:space": "cosine"}
)

    def add_chunks(self, chunks: list, url: str, category: str = ""):
        if not chunks:
            self.log.warning("No chunks to embed")
            return 0

        try:
            ids = [f"{url}_{i}" for i in range(len(chunks))]
            metadatas = [{"source_url": url, "category": category} for _ in chunks]

            self.collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            self.log.info(f"Stored {len(chunks)} embeddings for {url}")
            return len(chunks)

        except Exception as e:
            self.log.error(f"Failed to store embeddings for {url}: {e}")
            raise

    def query(self, query_text: str, top_k: int = 5):
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=top_k
            )

            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            return [
                {
                    "text": doc,
                    "source_url": meta.get("source_url", ""),
                    "category": meta.get("category", ""),
                    "score": 1 - dist  # cosine distance -> similarity
                }
                for doc, meta, dist in zip(documents, metadatas, distances)
            ]

        except Exception as e:
            self.log.error(f"Query failed: {e}")
            return []

    def delete_by_url(self, url: str):
        try:
            self.collection.delete(where={"source_url": url})
            self.log.info(f"Deleted embeddings for {url}")
            return True
        except Exception as e:
            self.log.error(f"Failed to delete embeddings for {url}: {e}")
            return False
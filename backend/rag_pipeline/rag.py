from model.model import Models
from core.vector import VectorStore
from utils.logger import Logger

SCORE_THRESHOLD = 0.3
TOP_K = 3

FALLBACK_MESSAGE = "I don't have enough information on this topic in my knowledge base."


class RAGPipeline:
    def __init__(self):
        self.vector_store = VectorStore()
        self.logger = Logger()
        self.model = Models()
        self.log = self.logger.get_logger()

    def _build_context(self, chunks: list) -> str:
        parts = []
        for chunk in chunks:
            parts.append(chunk["text"])
        return "\n\n".join(parts)

    def _get_sources(self, chunks: list) -> list:
        seen = set()
        sources = []
        for chunk in chunks:
            url = chunk.get("source_url", "")
            if url and url not in seen:
                seen.add(url)
                sources.append(url)
        return sources

    def answer(self, question: str, top_k: int = TOP_K) -> dict:
        if not question or not isinstance(question, str):
            return {"answer": FALLBACK_MESSAGE, "sources": []}

        try:
            results = self.vector_store.query(question, top_k=top_k)
        except Exception as e:
            self.log.error(f"Retrieval failed: {e}")
            return {"answer": FALLBACK_MESSAGE, "sources": []}

        relevant_chunks = [r for r in results if r.get("score", 0) >= SCORE_THRESHOLD]

        if not relevant_chunks:
            self.log.info(f"No relevant chunks found for question: {question}")
            return {"answer": FALLBACK_MESSAGE, "sources": []}

        context = self._build_context(relevant_chunks)
        sources = self._get_sources(relevant_chunks)

        try:
            response = self.model.generate_answer(context, question)
            return {"answer": response.strip(), "sources": sources}

        except Exception as e:
            self.log.error(f"LLM generation failed: {e}")
            return {"answer": FALLBACK_MESSAGE, "sources": []}
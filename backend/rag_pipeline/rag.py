import re
from supabase import create_client
from api.config import Config
from model.model import Models
from core.chunking import Chunking
from utils.logger import Logger

FALLBACK_MESSAGE = "I don't have enough information on this topic in my knowledge base."


class RAGPipeline:
    def __init__(self):
        self.config = Config()
        self.logger = Logger()
        self.model = Models()
        self.chunking = Chunking()
        self.log = self.logger.get_logger()
        self.supabase = None
        try:
            self.supabase = create_client(self.config.get_supabase_url(), self.config.get_supabase_key())
        except Exception as e:
            self.log.error(f"Failed to initialize Supabase client in RAGPipeline: {e}")

    def fetch_supabase_context(self, question: str, max_sources: int = 2):
        """Fetch processed_text from Supabase and rank sources by relevance to question."""
        if not self.supabase:
            return "", []
        try:
            res = self.supabase.table("urls_registry").select("processed_text", "url").execute()
            rows = res.data or []
            if not rows:
                return "", []

            raw_keywords = set(re.findall(r'\b[\w\u0900-\u097F]{2,}\b', question.lower()))
            stopwords = {
                "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
                "tell", "give", "describe", "explain", "that", "this", "with", "from",
                "have", "has", "does", "about", "your", "more", "detail", "details",
                "info", "information", "please", "kaise", "kya", "batao", "bataeye",
                "hai", "hain", "ko", "ka", "ki", "ke", "me", "mein", "par", "se",
                "aur", "ya", "bhi", "kisi", "bata", "mujhe", "karo", "do", "hota", "hoti", "hote"
            }
            keywords = [kw for kw in raw_keywords if kw not in stopwords]

            scored_rows = []
            for r in rows:
                p_text = r.get("processed_text", "")
                url = r.get("url", "")
                if not p_text:
                    continue

                p_text_lower = p_text.lower()
                score = 0
                if keywords:
                    for kw in keywords:
                        count = p_text_lower.count(kw)
                        if count > 0:
                            score += (count * 10) + len(kw)

                if score > 0:
                    scored_rows.append((score, p_text.strip(), url))

            scored_rows.sort(key=lambda x: x[0], reverse=True)

            if not scored_rows:
                # Greeting or no specific match: return representative context snippet
                context_parts = [r.get("processed_text").strip()[:2000] for r in rows[:max_sources] if r.get("processed_text")]
                sources = list(dict.fromkeys([r.get("url") for r in rows if r.get("url")]))[:max_sources]
                return "\n\n".join(context_parts), sources

            top_rows = scored_rows[:max_sources]
            context_parts = [item[1] for item in top_rows]
            sources = list(dict.fromkeys([item[2] for item in top_rows if item[2]]))

            combined_context = "\n\n".join(context_parts)
            return combined_context, sources

        except Exception as e:
            self.log.error(f"Error fetching processed_text from Supabase: {e}")
            return "", []

    def answer(self, question: str, top_k: int = 3) -> dict:
        if not question or not isinstance(question, str):
            return {"answer": FALLBACK_MESSAGE, "sources": []}

        context, sources = self.fetch_supabase_context(question, max_sources=top_k)

        if not context.strip():
            self.log.info(f"No relevant processed_text context found in Supabase for question: {question}")
            return {"answer": FALLBACK_MESSAGE, "sources": []}

        try:
            response = self.model.generate_answer(context, question)
            if not response or response.strip() == "":
                return {"answer": FALLBACK_MESSAGE, "sources": sources}
            return {"answer": response.strip(), "sources": sources}

        except Exception as e:
            self.log.error(f"Mistral AI answer generation failed: {e}")
            return {"answer": FALLBACK_MESSAGE, "sources": []}
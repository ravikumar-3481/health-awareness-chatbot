from sentence_transformers import SentenceTransformer
from core.chunking import Chunking
from utils.logger import Logger

_model = None
class Embaddings:
    def __init__(self):
        self.chunking = Chunking()
        self.logger = Logger()
        self.log = self.logger.get_logger()



    def get_embedding_model(self):
        global _model
        if _model is None:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        return _model
    
    def create_embeddings(self, texts) -> list:
        if not texts:
            return []
        try:
            if isinstance(texts, str):
                texts = self.chunking.chunking(texts, chunk_size=2000, chunk_overlap=240)
    
            if not texts:
                self.log.warning("No chunks generated from input text")
                return []
    
            model = self.get_embedding_model()
            embeddings = model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            self.log.error(f"Failed to create embeddings: {e}")
            return []
from api.config import Config
from langchain_mistralai import ChatMistralAI
from utils.logger import Logger

_llm = None
config = Config()

class LLM:
    def __init__(self):
        self.llm_api_key = config.get_mistral_api_key()
        self.logger = Logger()
        self.log = self.logger.get_logger()
    
    def get_llm(self, temperature : float = 0.3):
        global _llm
        if _llm is None:
            try:
                MISTRAL_API_KEY = self.llm_api_key
                _llm = ChatMistralAI(model="mistral-small-latest", mistral_api_key=MISTRAL_API_KEY, temperature=temperature)
            except Exception as e:
                self.log.error(f"Failed to initialize Mistral AI client: {e}")
                raise
        return _llm


    
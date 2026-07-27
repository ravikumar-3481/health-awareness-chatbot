from bs4 import BeautifulSoup
import requests
import re
from utils.logger import Logger

class Tools:
    def __init__(self):
        self.logger = Logger()
        self.log = self.logger.get_logger()


    def web_scraper(self, url : str) -> str:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            self.log.error(f"Error fetching {url}: {e}")
            return None
    
        soup = BeautifulSoup(response.text, "html.parser")
    
        
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            tag.decompose()
    
        text = soup.get_text(separator="\n")
        
        
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)
    
        return clean_text

    def clean_text(self, text: str) -> str:
        if not text:
            return ""
        
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"http\S+|www\.\S+", " ", text)
        text = re.sub(r"\S+@\S+", " ", text)
        text = re.sub(r"[#*_`~>]+", " ", text)
        text = re.sub(r"[^a-zA-Z0-9.,!?'\-\s]", " ", text)
        text = re.sub(r"([.\-]){2,}", r"\1", text)
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        text = text.replace("\n", " ")
        return text
    
    
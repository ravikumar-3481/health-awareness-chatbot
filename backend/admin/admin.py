from supabase import create_client
from api.config import Config
from utils.tools import Tools
from model.model import Models
from core.chunking import Chunking
from utils.logger import Logger
from rich import print



config = Config()


class AdminPanel:
    def __init__(self):
        self.client = create_client(config.get_supabase_url(), config.get_supabase_key())
        self.tools = Tools()
        self.model = Models()
        self.chunking = Chunking()
        self.logger = Logger()
        self.log = self.logger.get_logger()

    def add_url(self, url, category="", notes=""):
        existing = self.get_url(url)
        if existing:
            self.log.warning(f"URL already exists: {url}")
            return existing

        result = self.client.table("urls_registry").insert({
            "url": url,
            "category": category,
            "notes": notes
        }).execute()

        self.log.info(f"Added URL: {url}")
        return result.data[0]

    def get_all_urls(self):
        result = self.client.table("urls_registry").select("*").execute()
        return result.data

    def get_url(self, url):
        result = self.client.table("urls_registry").select("*").eq("url", url).execute()
        if result.data:
            return result.data[0]
        return None

    def update_status(self, url, status):
        result = self.client.table("urls_registry").update({"status": status}).eq("url", url).execute()
        if not result.data:
            self.log.warning(f"URL not found: {url}")
            return None
        return result.data[0]

    def delete_url(self, url):
        result = self.client.table("urls_registry").delete().eq("url", url).execute()
        if not result.data:
            self.log.warning(f"URL not found for deletion: {url}")
            return False
        self.log.info(f"Deleted URL: {url}")
        return True

    def scrape_and_process(self, url):
        entry = self.get_url(url)
        if not entry:
            self.log.warning(f"URL not registered: {url}")
            return None

        self.update_status(url, "scraping")

        raw_text = self.tools.web_scraper(url)
        if not raw_text:
            self.update_status(url, "failed")
            self.log.error(f"Scraping failed for: {url}")
            return None

        try:
            processed_text = self.model.transform_text(raw_text)
        except Exception as e:
            self.update_status(url, "failed")
            self.log.error(f"Processing failed for {url}: {e}")
            return None 

        chunks = self.chunking.chunking(processed_text)

        result = self.client.table("urls_registry").update({
            "status": "scraped",
            "processed_text": processed_text,
            "chunk_count": len(chunks)
        }).eq("url", url).execute()

        self.log.info(f"Scraped and processed: {url} ({len(chunks)} chunks)")
        return result.data[0]

    def add_data(self, url, category="", notes=""):
        existing = self.get_url(url)
        try:
            if existing:
                return existing
            self.add_url(url, category, notes)
            data = self.scrape_and_process(url)
            return data
        except Exception as e:
            self.log.error(f"Failed to add data: {e}")
            raise


    def get_processed_text(self, table_name: str) -> list:
        try:
            supabase = create_client(config.get_supabase_url(), config.get_supabase_key())
            response = supabase.table(table_name).select("processed_text", "url", "category").execute()
    
            rows = response.data
            if not rows:
                self.log.warning("No data found in Supabase table !!")
                return []
    
            data = [
                {
                    "processed_text": row.get("processed_text"),
                    "url": row.get("url"),
                    "category": row.get("category"),
                }
                for row in rows
                if row.get("processed_text")
            ]
            return data
    
        except Exception as e:
            self.log.error(f"Failed to fetch data from Supabase: {e}")
            raise RuntimeError(f"Failed to fetch data from Supabase: {e}") from e

        
    def get_data(self):
        try:
            recive_data = self.get_processed_text(table_name="urls_registry")
    
            if not recive_data:
                self.log.warning("No data found to process !!")
                return []
            contents= []
            urls = []
            categories = []
            for i, data in enumerate(recive_data):
                self.log.info(f"Accessing Data {i+1}/{len(recive_data)}")
    
                text = data.get("processed_text")
                url = data.get("url")
                category = data.get("category")
    
                if not text:
                    self.log.warning(f"Skipping item {i+1} — missing 'processed_text'")
                    continue
    
                content = self.tools.clean_text(text)
                contents.append(content)
                urls.append(url)
                categories.append(category)
    
            return contents, urls, categories
    
        except Exception as e:
            self.log.error(f"Failed to fetch data from Supabase: {e}")
            raise RuntimeError(f"Failed to fetch data from Supabase: {e}") from e
    
    def preview_text(self, url, max_chars=1000):
        entry = self.get_url(url)
        if not entry:
            return None
        return entry["processed_text"][:max_chars] if entry["processed_text"] else ""
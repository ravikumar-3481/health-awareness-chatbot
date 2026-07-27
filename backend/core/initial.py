from utils.tools import Tools
from model.model import Models

tools = Tools()


class InitializeModel:
    def __init__(self):
        self.tools = Tools()
        self.model = Models()


    def initialize(self, url : str):
        scrapped_text = self.tools.web_scraper(url)
        processed_text = self.model.transform_text(scrapped_text)
        return processed_text
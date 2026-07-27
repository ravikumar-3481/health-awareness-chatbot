from admin.admin import AdminPanel
from core.vector import VectorStore
from utils.logger import Logger
from utils.tools import Tools



class InitializeSystem:
    def __init__(self):
        self.admin = AdminPanel()
        self.vector = VectorStore()
        self.tools = Tools()
        self.logger = Logger()
        self.log= self.logger.get_logger()

    def process_start(self):
        pass
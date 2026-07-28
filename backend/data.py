from admin.admin import AdminPanel

from utils.logger import Logger
from utils.tools import Tools



class InitializeSystem:
    def __init__(self):
        self.admin = AdminPanel()
        self.tools = Tools()
        self.logger = Logger()
        self.log= self.logger.get_logger()

    def process_start(self):
        pass
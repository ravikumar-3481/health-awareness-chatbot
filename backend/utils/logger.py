from rich import print
import logging
from rich.logging import RichHandler

class Logger:
    def __init__(self, name: str = "app", level: str = "INFO"):
            self.logger = logging.getLogger(name)
            self.logger.setLevel(level)
    
            if not self.logger.handlers:
                handler = RichHandler(
                    rich_tracebacks=True,
                    markup=True,  
                    show_time=True,
                    show_path=False,
                )
                formatter = logging.Formatter(
                    fmt="%(message)s",
                    datefmt="[%X]"
                )
                handler.setFormatter(formatter)
                self.logger.addHandler(handler)
    
                self.logger.propagate = False

    def get_logger(self) -> logging.Logger:
        return self.logger
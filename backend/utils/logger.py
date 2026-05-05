"""
Logger utility - Centralized logging configuration
"""

import logging
import sys
from datetime import datetime

# Create logger
logger = logging.getLogger("autorift")
logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

console_handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(console_handler)

# Optional: File handler
try:
    log_file = f"logs/autorift_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
except Exception as e:
    logger.warning(f"Could not create log file: {str(e)}")

# Export logger
__all__ = ['logger']

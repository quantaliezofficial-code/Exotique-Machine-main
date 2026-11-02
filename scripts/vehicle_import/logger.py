"""
Logging infrastructure for Exotique Vehicle Import.
Ensures comprehensive auditing while strictly masking sensitive secrets, tokens, and passwords.
"""

import re
import sys
import logging
from datetime import datetime
from pathlib import Path
from scripts.vehicle_import.config import config

class SecretFilter(logging.Filter):
    """Filter that masks tokens, passwords, and sensitive keys from log output."""
    PATTERNS = [
        (re.compile(r"(Bearer\s+)[a-zA-Z0-9_\-\.]+", re.IGNORECASE), r"\1[MASKED_TOKEN]"),
        (re.compile(r"('?\"?password'?\"?\s*[:=]\s*'?\"?)[^'\",\s]+('?\"?)", re.IGNORECASE), r"\1[MASKED_PASSWORD]\2"),
        (re.compile(r"('?\"?token'?\"?\s*[:=]\s*'?\"?)[^'\",\s]+('?\"?)", re.IGNORECASE), r"\1[MASKED_TOKEN]\2"),
        (re.compile(r"(postgresql(?:\+psycopg2)?://[^:]+:)([^@]+)(@)", re.IGNORECASE), r"\1[MASKED_DB_PASS]\3"),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, repl in self.PATTERNS:
                record.msg = pattern.sub(repl, record.msg)
        return True


def setup_logger(name: str = "exotique.importer") -> logging.Logger:
    config.ensure_directories()
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if already configured
    if logger.handlers:
        return logger

    # Console Handler
    c_handler = logging.StreamHandler(sys.stdout)
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    c_handler.setFormatter(c_format)
    c_handler.addFilter(SecretFilter())
    logger.addHandler(c_handler)

    # File Handler
    log_filename = f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    f_handler = logging.FileHandler(config.logs_dir / log_filename, encoding="utf-8")
    f_handler.setLevel(logging.DEBUG)
    f_format = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    f_handler.setFormatter(f_format)
    f_handler.addFilter(SecretFilter())
    logger.addHandler(f_handler)

    return logger

logger = setup_logger()

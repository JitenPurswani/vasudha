import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "vasudha-secret-key-2026-change-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", 7))
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), os.getenv("DATABASE_NAME", "users.db"))
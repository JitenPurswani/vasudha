from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from config import Config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=Config.EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)

def decode_access_token(token: str):
    """Decode and validate JWT token"""
    return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
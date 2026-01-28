from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection, init_db
import security
from pydantic import BaseModel, Field, validator
from typing import Optional
from fastapi import Header
import logging

app = FastAPI(title="Vasudha Auth Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auth_agent")

class RegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=8)
    state: str
    district: str
    language: str
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None
    pH: Optional[float] = None
    @validator('username')
    def validate_username(cls, v):
        v = v.strip()
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            logger.warning(f"Validation failed: Invalid username format '{v}'")
            raise ValueError('Username must be alphanumeric or underscores only')
        return v

    @validator('password')
    def validate_password(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v

class LoginSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=8)
    
class UpdateProfileSchema(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20)
    language: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None
    pH: Optional[float] = None

@app.patch("/user/profile")
async def update_profile(
    data: UpdateProfileSchema, 
    authorization: Optional[str] = Header(None) 
):
    print(f"DEBUG: Received Data: {data.dict()}")
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization format")

    token = parts[1]
    
    try:
        # Assign payload within the try block
        payload = security.decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token missing identity")
    except Exception as e:
        print(f"JWT Decode Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Token is invalid or expired")
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if data.username and data.username != username:
            cursor.execute("SELECT id FROM users WHERE username = ?", (data.username,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="New username already exists")

        mapping = {
            "username": "username",
            "language": "language",
            "state": "state_key",
            "district": "district_key",
            "N": "n_val",
            "P": "p_val",
            "K": "k_val",
            "pH": "ph_val"
        }
        
        updates = []
        values = []
        for field, col in mapping.items():
            val = getattr(data, field)
            if val is not None:
                updates.append(f"{col} = ?")
                values.append(val)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(username)  
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, values)
        conn.commit()
        
        search_name = data.username if data.username else username
        cursor.execute("SELECT * FROM users WHERE username = ?", (search_name,))
        u = cursor.fetchone()
        
        return {
            "status": "success",
            "profile": {
                "name": u['username'],
                "district": u['district_key'],
                "state": u['state_key'],
                "language": u['language'],
                "n": u['n_val'],
                "p": u['p_val'],
                "k": u['k_val'],
                "ph": u['ph_val']
            }
        }
    finally:
        conn.close()

@app.post("/register")
async def register(user: RegisterSchema):
    logger.info(f"Register attempt for username: {user.username}")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE username = ?", (user.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")

        hashed_pw = security.hash_password(user.password)
        cursor.execute("""
            INSERT INTO users (username, password_hash, state_key, district_key, language, n_val, p_val, k_val, ph_val)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user.username, hashed_pw, user.state, user.district, user.language, user.N, user.P, user.K, user.pH))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@app.post("/login")
async def login(credentials: LoginSchema):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE username = ?", (credentials.username,))
        user = cursor.fetchone()

        if not user or not security.verify_password(credentials.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = security.create_access_token({"sub": user['username']})
        return {
            "token": token,
            "profile": {
                "district": user['district_key'],
                "state": user['state_key'],
                "language": user['language'],
                "n": user['n_val'], 
                "p": user['p_val'],
                "k": user['k_val'],
                "ph": user['ph_val']
            }
        }
    finally:
        conn.close()
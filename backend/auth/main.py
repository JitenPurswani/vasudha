from fastapi import FastAPI, HTTPException, status
from database import get_connection, init_db
import security
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Vasudha Auth Agent")

init_db()

class RegisterSchema(BaseModel):
    username: str
    password: str
    state: str
    district: str
    language: str
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None
    pH: Optional[float] = None

class LoginSchema(BaseModel):
    username: str
    password: str

@app.post("/register")
async def register(user: RegisterSchema):
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
                "language": user['language']
            }
        }
    finally:
        conn.close()
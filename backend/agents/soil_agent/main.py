# main.py (Soil Agent - Simplified)
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import sqlite3
import os
import re # For cleaning input

# --- 1. Initialize FastAPI app ---
app = FastAPI(title="Soil Agent")

# --- 2. Database Setup ---
DB_NAME = 'district_soil_db.sqlite'
DB_PATH = os.path.join(os.path.dirname(__file__), DB_NAME)
TABLE_NAME = 'soil_data'

def get_db_connection():
    """Establishes connection to the SQLite database."""
    if not os.path.exists(DB_PATH):
        print(f"❌ DATABASE FILE NOT FOUND AT: {DB_PATH}")
        return None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"❌ Database connection error: {e}")
        return None

# --- 3. Define Output Data Models ---
class SoilDataOutput(BaseModel):
    N: float | None
    P: float | None
    K: float | None
    pH: float | None

class SoilResponse(BaseModel):
    district: str
    state: str
    soil_data: SoilDataOutput
    status: str

# --- 4. Database Query Function ---
def query_soil_data(district: str, state: str) -> dict | None:
    """Queries the SQLite DB for soil data based on cleaned district and state."""
    conn = get_db_connection()
    if conn is None: return None
    cursor = conn.cursor()
    try:
        # Clean and Standardize Inputs before query
        district_clean = re.sub(r'\s*\(.*\)\s*$', '', district, flags=re.IGNORECASE).strip()
        district_clean = re.sub(r'\s+(Tehsil|Tahsil|Taluka|Mandal|District|Subdivision)$', '', district_clean, flags=re.IGNORECASE).strip()
        district_query = district_clean.title()
        state_query = state.strip().title()

        print(f"Querying DB for District: '{district_query}', State: '{state_query}'") # Debug print

        # Case-insensitive query for district, exact for state. Assumes DB columns are 'District' and 'Region'
        cursor.execute(
            f"SELECT N_avg, P_avg, K_avg, pH_avg FROM {TABLE_NAME} WHERE UPPER(District) = UPPER(?) AND Region = ?",
            (district_query, state_query)
        )
        result = cursor.fetchone()
        conn.close()
        return dict(result) if result else None
    except sqlite3.Error as e:
        print(f"Database query error: {e}")
        conn.close()
        return None
    except Exception as e:
        print(f"Unexpected error during query: {e}")
        if conn: conn.close()
        return None

# --- 5. API Endpoint ---
@app.get("/get_soil_data_by_district/", response_model=SoilResponse)
async def get_soil_data_by_district(
    district: str = Query(..., description="Name of the district (e.g., Ludhiana, Nashik)"),
    state: str = Query(..., description="Name of the state (e.g., Punjab, Maharashtra)")
):
    """
    Takes district and state names, queries the DB, and returns average soil data.
    """
    soil_result = query_soil_data(district, state)

    if soil_result:
        return SoilResponse(
            district=district.strip().title(), # Return original input for consistency
            state=state.strip().title(),
            soil_data=SoilDataOutput(
                N=soil_result.get('N_avg'),
                P=soil_result.get('P_avg'),
                K=soil_result.get('K_avg'),
                pH=soil_result.get('pH_avg')
            ),
            status="OK"
        )
    else:
        print(f"Data not found for District: '{district}', State: '{state}'")
        return SoilResponse(
            district=district.strip().title(),
            state=state.strip().title(),
            soil_data=SoilDataOutput(N=None, P=None, K=None, pH=None),
            status="DistrictOrStateNotFoundInDB"
        )

# --- 6. Root endpoint ---
@app.get("/")
def read_root():
    return {"status": "Soil Agent is running"}
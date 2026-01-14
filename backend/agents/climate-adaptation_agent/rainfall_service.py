import sqlite3
import os

DB_NAME = "district_rainfall_db.sqlite"
DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "district_rainfall_db.sqlite"
)

TABLE_NAME = "seasonal_rainfall"


def get_seasonal_rainfall(district: str, season: str) -> float:
    """
    Fetch average seasonal rainfall (mm) for a district.
    season: kharif | rabi | zaid
    """

    if not os.path.exists(DB_PATH):
        raise FileNotFoundError("Rainfall database not found")

    if season.lower() == "kharif":
        column = "Avg_Rainfall_Kharif_mm"
    elif season.lower() == "rabi":
        column = "Avg_Rainfall_Rabi_mm"
    elif season.lower() == "zaid":
        column = "Avg_Rainfall_Zaid_mm"
    else:
        raise ValueError("Invalid season")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = f"""
        SELECT {column}
        FROM {TABLE_NAME}
        WHERE UPPER(District) = UPPER(?)
    """

    cursor.execute(query, (district.strip(),))
    row = cursor.fetchone()
    conn.close()

    if not row or row[0] is None:
        raise ValueError(f"Rainfall data not found for district: {district}")

    return float(row[0])

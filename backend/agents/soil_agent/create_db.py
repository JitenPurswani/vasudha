# create_db.py
import pandas as pd
import sqlite3
import os

csv_filename = 'district_soil_database_ready.csv'
db_filename = 'district_soil_db.sqlite'
table_name = 'soil_data'

# Check if CSV exists
if not os.path.exists(csv_filename):
    print(f"❌ Error: '{csv_filename}' not found. Place it in the same directory.")
else:
    df_soil_db_data = pd.read_csv(csv_filename)
    print(f"Loaded {len(df_soil_db_data)} rows from CSV.")

    # Create SQLite Connection
    conn = sqlite3.connect(db_filename)
    cursor = conn.cursor()

    # Create Table and Insert Data using pandas
    try:
        # Use the correct column names from your CSV
        # Assuming they are 'Region', 'District', 'Latitude', 'Longitude', 'N_avg', 'P_avg', 'K_avg', 'pH_avg'
        df_soil_db_data.to_sql(table_name, conn, if_exists='replace', index=False)
        print(f"✅ Successfully created SQLite database '{db_filename}' with table '{table_name}'.")

        # Add index for faster queries (using correct column names)
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_district_region ON {table_name} (District, Region)")
        conn.commit()
        print("✅ Added index on District and Region.")

    except Exception as e:
        print(f"❌ Error during database creation: {e}")

    finally:
        conn.close() # Close the connection
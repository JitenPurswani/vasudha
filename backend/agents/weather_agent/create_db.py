import pandas as pd
import sqlite3
import os

csv_filename = 'district_seasonal_rainfall.csv' # Use the actual name of your file
db_filename = 'district_rainfall_db.sqlite'
table_name = 'seasonal_rainfall'

if not os.path.exists(csv_filename):
    print(f"❌ Error: '{csv_filename}' not found. Place it in the same directory.")
else:
    df_rainfall_db_data = pd.read_csv(csv_filename)
    print(f"Loaded {len(df_rainfall_db_data)} rows from CSV.")

    # Clean district names for better matching
    df_rainfall_db_data['District'] = df_rainfall_db_data['District'].str.strip().str.title()

    conn = sqlite3.connect(db_filename)
    cursor = conn.cursor()

    try:
        df_rainfall_db_data.to_sql(table_name, conn, if_exists='replace', index=False)
        print(f"✅ Successfully created SQLite database '{db_filename}' with table '{table_name}'.")

        # Add an index on District for faster lookups
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_district ON {table_name} (District)")
        conn.commit()
        print("✅ Added index on District.")

    except Exception as e:
        print(f"❌ Error during database creation: {e}")

    finally:
        conn.close()
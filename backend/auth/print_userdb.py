import sqlite3
from config import Config
import json

def print_userdb():
    """Print all users from the database"""
    try:
        conn = sqlite3.connect(Config.DATABASE_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        if not users:
            print("No users found in the database")
        else:
            print(f"Total users: {len(users)}\n")
            print("=" * 100)
            
            for user in users:
                user_dict = dict(user)
                print(f"\nUser ID: {user_dict['id']}")
                print(f"Username: {user_dict['username']}")
                print(f"State Key: {user_dict['state_key']}")
                print(f"District Key: {user_dict['district_key']}")
                print(f"Language: {user_dict['language']}")
                print(f"Soil Values - N: {user_dict['n_val']}, P: {user_dict['p_val']}, K: {user_dict['k_val']}, pH: {user_dict['ph_val']}")
                print(f"Created At: {user_dict['created_at']}")
                print("-" * 100)
        
        conn.close()
        
    except sqlite3.OperationalError as e:
        print(f"Error: Database not found or table doesn't exist. Make sure to initialize the database first.")
        print(f"Details: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print_userdb()

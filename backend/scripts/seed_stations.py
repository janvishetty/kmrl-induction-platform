import csv
import sys
import os

# This allows the script to find your Supabase client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.supabase_client import supabase

# Make sure these files are in the same 'scripts' folder
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STOPS_FILE = os.path.join(SCRIPT_DIR, 'stops.txt')
TRANSLATIONS_FILE = os.path.join(SCRIPT_DIR, 'translations.txt')

def get_translations():
    """Reads translations.txt and returns a dictionary of {stop_id: malayalam_name}"""
    translations = {}
    with open(TRANSLATIONS_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # We only want Malayalam (ml) translations for stop names
            if row['table_name'] == 'stops' and row['language'] == 'ml':
                translations[row['record_id']] = row['translation']
    return translations

def seed_stations():
    print(" Starting Kochi Metro Station Seeding...")
    
    if not os.path.exists(STOPS_FILE) or not os.path.exists(TRANSLATIONS_FILE):
        print(" Error: stops.txt or translations.txt not found in the scripts folder.")
        return

    ml_names = get_translations()
    stations_to_upsert = []
    
    # The first and last stops are our terminals
    TERMINAL_IDS = ['ALVA', 'TPHT'] 

    with open(STOPS_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for order, row in enumerate(reader, start=1):
            stop_id = row['stop_id']
            stop_name = row['stop_name']
            
            # Generate clean IDs like STN-01, STN-02...
            station_id = f"STN-{str(order).zfill(2)}"
            
            stations_to_upsert.append({
                "id": station_id,
                "order": order,
                "name": stop_name,
                "name_ml": ml_names.get(stop_id, stop_name), # Fallback to English if no ML found
                "lat": float(row['stop_lat']),
                "lng": float(row['stop_lon']),
                "is_terminal": stop_id in TERMINAL_IDS,
                "is_transfer": False,
                "coord_source": "gtfs_official"
            })

    print(f"Sending {len(stations_to_upsert)} stations to Supabase...")
    
    # Upsert into Supabase
    response = supabase.table("stations").upsert(
        stations_to_upsert, 
        on_conflict="id"
    ).execute()
    
    if response.data:
        print("Success! Stations table updated with real Kochi Metro data.")
        print("\nFirst 3 stations seeded:")
        for s in response.data[:3]:
            print(f"   • {s['name']} / {s['name_ml']} → ({s['lat']}, {s['lng']})")
        print("   ...\n")
    else:
        print("Error seeding stations:", response)

if __name__ == "__main__":
    seed_stations()
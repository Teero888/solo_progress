import os
import re
import json
import urllib.request

MAP_INFO_URL = "https://raw.githubusercontent.com/Teero888/KoGmaps/refs/heads/main/mapinfo.txt"

def load_blacklist():
    blacklist = set()
    if os.path.exists('blacklist.txt'):
        with open('blacklist.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    blacklist.add(line)
    return blacklist

def parse_maps():
    maps = []
    blacklist = load_blacklist()
    try:
        with urllib.request.urlopen(MAP_INFO_URL) as response:
            content = response.read().decode('utf-8')
            lines = content.splitlines()
    except Exception as e:
        print(f"Error fetching map info: {e}")
        return []

    data_lines = lines[2:]
    for line in data_lines:
        if not line.strip(): continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 7: continue

        map_name = parts[0]
        if map_name in blacklist: continue

        difficulty = parts[1]
        if difficulty == 'Solo': continue

        maps.append({
            "name": map_name,
            "difficulty": difficulty,
            "stars": parts[2],
            "stars_count": parts[2].count('★'),
            "points": int(parts[3]) if parts[3].isdigit() else 0,
            "length": parts[4],
            "creator": parts[5],
            "date": parts[6]
        })
    return maps

def parse_demos():
    # MapName -> PlayerName -> BestTime
    progress = {}
    if not os.path.exists('demos'):
        return progress

    for filename in os.listdir('demos'):
        if filename.endswith('.demo'):
            # Format: MapName_TimeInSeconds_PlayerName.demo
            # Use regex to find the time (float) which separates map name and player name
            match = re.search(r'(.+)_(\d+\.\d+)_([^/]+)\.demo', filename)
            if match:
                map_name = match.group(1)
                try:
                    time = float(match.group(2))
                except ValueError:
                    continue
                player_name = match.group(3)

                if map_name not in progress:
                    progress[map_name] = {}

                if player_name not in progress[map_name] or time < progress[map_name][player_name]:
                    progress[map_name][player_name] = time
    return progress

maps = parse_maps()
progress = parse_demos()

# Combine data
data = {
    "maps": maps,
    "progress": progress,
    "players": list(set(p for m in progress.values() for p in m.keys()))
}

os.makedirs('src/data', exist_ok=True)
with open('src/data/maps.json', 'w+', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Parsed {len(maps)} maps and found progress for {len(data['players'])} players.")

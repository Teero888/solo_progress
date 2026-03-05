import os
import re
import json

def parse_maps():
    maps = []
    with open('mapinfo and credits.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        data_lines = lines[2:]
        for line in data_lines:
            if not line.strip(): continue
            parts = [p.strip() for p in line.split('|')]
            if len(parts) < 6: continue
            maps.append({
                "name": parts[0],
                "difficulty": parts[1],
                "stars": parts[2],
                "stars_count": parts[2].count('★'),
                "points": int(parts[3]) if parts[3].isdigit() else 0,
                "creator": parts[4],
                "date": parts[5]
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
            parts = filename.replace('.demo', '').split('_')
            if len(parts) >= 3:
                map_name = parts[0]
                try:
                    time = float(parts[1])
                except ValueError:
                    continue
                player_name = "_".join(parts[2:]) # Handle names with underscores
                
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

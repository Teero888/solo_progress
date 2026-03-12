import os
import re
import json
import urllib.request
import urllib.parse
import shutil

BASE_URL = "https://teero888.github.io/solo_progress/"

def load_blacklist():
    blacklist = set()
    if os.path.exists('blacklist.txt'):
        with open('blacklist.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    blacklist.add(line)
    return blacklist

def generate_preview_html(map_info):
    map_name = map_info["name"]
    difficulty = map_info["difficulty"]
    stars = map_info["stars"]
    points = map_info["points"]
    creator = map_info["creator"]
    
    # Sanitize for HTML attributes
    safe_name = map_name.replace('"', '&quot;')
    safe_creator = creator.replace('"', '&quot;')
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{safe_name} - Solo Progress</title>
    <meta property="og:title" content="{safe_name} - Solo Progress">
    <meta property="og:description" content="Difficulty: {difficulty} | Stars: {stars} | Points: {points} | Creator: {safe_creator}">
    <meta property="og:image" content="{BASE_URL}thumbnails/{urllib.parse.quote(map_name)}.png">
    <meta property="og:url" content="{BASE_URL}preview/{urllib.parse.quote(map_name)}.html">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{safe_name} - Solo Progress">
    <meta name="twitter:description" content="Difficulty: {difficulty} | Creator: {safe_creator}">
    <meta name="twitter:image" content="{BASE_URL}thumbnails/{urllib.parse.quote(map_name)}.png">
    <meta http-equiv="refresh" content="0; url=../index.html?preview={urllib.parse.quote(map_name)}">
    <script>window.location.href = "../index.html?preview={urllib.parse.quote(map_name)}";</script>
</head>
<body style="background: #1a1a1a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="text-align: center;">
        <h2>Redirecting to map preview for {safe_name}...</h2>
        <p>If you are not redirected, <a href="../index.html?preview={urllib.parse.quote(map_name)}" style="color: #4a90e2;">click here</a>.</p>
    </div>
</body>
</html>
"""
    os.makedirs('public/preview', exist_ok=True)
    with open(f'public/preview/{map_name}.html', 'w+', encoding='utf-8') as f:
        f.write(html_content)

def parse_maps():
    maps = []
    blacklist = load_blacklist()
    
    # Clear old previews
    if os.path.exists('public/preview'):
        shutil.rmtree('public/preview')
    os.makedirs('public/preview', exist_ok=True)
    
    try:
        with open('public/maps/mapinfo.txt', 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading map info: {e}")
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

        map_info = {
            "name": map_name,
            "difficulty": difficulty,
            "stars": parts[2],
            "stars_count": parts[2].count('★'),
            "points": int(parts[3]) if parts[3].isdigit() else 0,
            "length": parts[4],
            "creator": parts[5],
            "date": parts[6]
        }
        maps.append(map_info)
        generate_preview_html(map_info)
        
    return maps

def parse_demos():
    # MapName -> PlayerName -> BestTime
    progress = {}
    if not os.path.exists('public/demos'):
        return progress

    for filename in os.listdir('public/demos'):
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

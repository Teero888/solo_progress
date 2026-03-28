#!/bin/python3

import os
import re
import json
import urllib.request
import urllib.parse
import shutil
import time
import sys

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

def get_api_data(map_name, skip_api=False, cache={}):
    if skip_api:
        # Mock data for testing
        return {
            "top100": [
                {"playerName": "Teero", "time": 97.64, "rank": 5},
                {"playerName": "Knuski", "time": 79.7, "rank": 1}
            ],
            "top500": [
                {"playerName": "SomeOtherPlayer", "time": 150.0, "rank": 450}
            ]
        }

    if map_name in cache:
        return cache[map_name]

    url = f"https://ravenkog.com/api/maps?mapName={urllib.parse.quote(map_name)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://ravenkog.com/',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Priority': 'u=0, i'
    }
    retries = 3
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                content_type = response.info().get_content_type()
                if 'application/json' not in content_type:
                    print(f"Non-JSON response for {map_name}: {content_type}. Bot protection triggered?")
                    return None
                data = json.loads(response.read().decode())
                cache[map_name] = data
                time.sleep(3) # avoid rate limiting
                return data
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_time = (i + 1) * 2
                print(f"Rate limited for {map_name}, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            print(f"HTTP Error fetching API data for {map_name}: {e}")
            return None
        except Exception as e:
            print(f"Error fetching API data for {map_name}: {e}")
            return None
    return None

def parse_demos(skip_api=False):
    # MapName -> PlayerName -> { time, verified, rank }
    progress = {}
    if not os.path.exists('public/demos'):
        return progress

    # First pass: collect best times from local demos
    raw_progress = {}
    for filename in os.listdir('public/demos'):
        if filename.endswith('.demo'):
            match = re.search(r'(.+)_(\d+\.\d+)_([^/]+)\.demo', filename)
            if match:
                map_name = match.group(1)
                try:
                    time = float(match.group(2))
                except ValueError:
                    continue
                player_name = match.group(3)

                if map_name not in raw_progress:
                    raw_progress[map_name] = {}

                if player_name not in raw_progress[map_name] or time < raw_progress[map_name][player_name]:
                    raw_progress[map_name][player_name] = time

    # Second pass: verify against API
    count = 0
    total = len(raw_progress)
    for map_name, players in raw_progress.items():
        count += 1
        if not skip_api:
            print(f"[{count}/{total}] Fetching API data for {map_name}...")

        progress[map_name] = {}
        api_data = get_api_data(map_name, skip_api=skip_api)

        if api_data:
            # Create a lookup for API data across ALL keys starting with "top"
            # key: (playerName, time)
            api_lookup = {}
            for key, value in api_data.items():
                if key.startswith("top") and isinstance(value, list):
                    for entry in value:
                        # Round time to 3 decimal places for comparison
                        entry_time = round(float(entry["time"]), 3)
                        api_lookup[(entry["playerName"], entry_time)] = entry["rank"]

            for player_name, time in players.items():
                # Round local time to 3 decimal places
                local_time = round(time, 3)
                rank = api_lookup.get((player_name, local_time))
                progress[map_name][player_name] = {
                    "time": time,
                    "verified": rank is not None,
                    "rank": rank
                }
        else:
            for player_name, time in players.items():
                progress[map_name][player_name] = {
                    "time": time,
                    "verified": False,
                    "rank": None
                }
    return progress

skip_api = "--skip-api" in sys.argv
maps = parse_maps()
progress = parse_demos(skip_api=skip_api)

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

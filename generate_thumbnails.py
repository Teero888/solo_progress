import os
import subprocess
import shutil
from pathlib import Path

MAPS_DIR = Path('public/maps')
THUMBNAILS_DIR = Path('public/thumbnails')
BLACKLIST_FILE = Path('blacklist.txt')
BINARY_PATH = Path('twgpu/target/release/twgpu-map-photography')
RESOLUTION = '1200x750'

def load_blacklist():
    if not BLACKLIST_FILE.exists():
        return set()
    with open(BLACKLIST_FILE, 'r') as f:
        return {line.strip() for line in f if line.strip() and not line.startswith('#')}

def generate_thumbnails():
    """
    Recursively finds all .map files in MAPS_DIR and generates 
    1200x750 thumbnails using the twgpu-map-photography tool.
    """
    global BINARY_PATH
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

    if not BINARY_PATH.exists():
        debug_path = Path('twgpu/target/debug/twgpu-map-photography')
        if debug_path.exists():
            BINARY_PATH = debug_path
        else:
            print(f"Error: Photography tool not found.")
            print(f"Please build it first using:")
            print(f"cd twgpu && cargo build --release -p twgpu-tools --bin twgpu-map-photography")
            return

    blacklist = load_blacklist()
    map_files = []
    for map_path in MAPS_DIR.rglob('*.map'):
        if 'SOLO' in map_path.parts:
            continue
        if map_path.stem in blacklist:
            continue
        map_files.append(map_path)

    total_maps = len(map_files)
    print(f"Found {total_maps} maps after filtering (ignored SOLO and blacklist).")

    abs_binary = BINARY_PATH.resolve()
    abs_thumbnails = THUMBNAILS_DIR.resolve()

    for i, map_path in enumerate(map_files, 1):
        map_name = map_path.stem
        target_file = abs_thumbnails / f"{map_name}.png"
        if target_file.exists():
            print(f"[{i}/{total_maps}] Skipping {map_name} (thumbnail already exists)")
            continue

        print(f"[{i}/{total_maps}] Generating thumbnail for {map_name}...")
        cmd = [
            str(abs_binary),
            str(map_path.resolve()),
            '-r', RESOLUTION,
        ]
        try:
            result = subprocess.run(cmd, cwd=abs_thumbnails, check=True, capture_output=True, text=True)
            output_file = abs_thumbnails / f"{map_name}_{RESOLUTION}.png"
            if output_file.exists():
                output_file.replace(target_file)
                print(f"  Successfully saved to {target_file.name}")
            else:
                print(f"  Warning: Expected output file {output_file.name} not found.")
                if result.stdout:
                    print(f"  Tool output: {result.stdout.strip()}")
        except subprocess.CalledProcessError as e:
            print(f"  Error generating thumbnail for {map_name}:")
            print(f"  Command failed with exit code {e.returncode}")
            if e.stderr:
                print(f"  Error details: {e.stderr.strip()}")
        except Exception as e:
            print(f"  An unexpected error occurred for {map_name}: {e}")

if __name__ == "__main__":
    generate_thumbnails()

# Solo Progress (KoG)

A web application to track my solo progress on [**KoG (King of Gores)**](https://kog.tw/), a specialized DDNet/Teeworlds gamemode. This site provides a comprehensive list of maps, personal records, and an integrated WASM-based demo viewer to watch replays directly in the browser.
The site is currently deployed on github pages: https://teero888.github.io/solo_progress/

## Features

- **map database:** Browse all KoG maps with stats from https://github.com/Gamer12120/KoGmaps.
- **progress tracking:** View finished maps and best times for various players (myself, unless ***you*** pr your demos).
- **integrated demo viewer:** Watch `.demo` replays using the DDNet WASM engine thanks to [Robyt3](https://github.com/Robyt3).
- **interactive map previews:** Hover to see map thumbnails or click to view full interactive previews thanks to [patigas work](https://gitlab.com/ddnet-rs/twgpu).
- **filtering & sorting:** Filter by difficulty, length, status (Finished/Pending), and player. Sort by any field.
- **social sharing:** Direct links to map previews with OpenGraph support for Discord/Twitter.

## Getting Started

### Prerequisites

- **Node.js:** For running the web frontend.
- **Python 3:** For running data processing and thumbnail generation scripts.
- **Rust (optional):** Required if you want to rebuild the `twgpu-map-photography` tool for thumbnails.
- **Emscripten (optional):** Required to rebuild the DDNet WASM engine.

### Running the Website

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```

### Utility Scripts

- **`python parse_maps.py`**: 
  - Reads `public/maps/mapinfo.txt` and `public/demos/`.
  - Generates `src/data/maps.json` which fuels the website.
  - Creates individual HTML preview files in `public/preview/` for social sharing.
- **`python generate_thumbnails.py`**:
  - Uses the `twgpu-map-photography`, which has to be built beforehand in the twgpu directory with `cargo build --release`, tool to generate 1200x750 thumbnails for all maps.
  - Automatically skips maps in `blacklist.txt`.

## Building the Emscripten WASM Engine (mostly a reminder for myself)

If you need to update the DDNet WASM engine used for the demo viewer:

1.  **Set up Emscripten:** Use **emsdk version 4.0.22**, it won't work with versions >= 5.0.
2.  **Prepare Libraries:**
    ```bash
    scripts/compile_libs/gen_libs.sh build-webasm-libs webasm
    cp -r build-webasm-libs/ddnet-libs/. ddnet-libs/
    ```
3.  **Configure and Build:**
    make sure that you don't have CC or CXX overriden
    ```bash
    mkdir build && cd build
    emcmake cmake .. -G "Unix Makefiles" \
      -DVIDEORECORDER=OFF -DVULKAN=OFF -DSERVER=OFF -DTOOLS=OFF \
      -DPREFER_BUNDLED_LIBS=ON -DCMAKE_BUILD_TYPE=Release
    cmake --build . -j$(nproc)
    ```
4.  **Deploy:** Move the generated `DDNet.wasm`, `DDNet.js`, and `DDNet.data` to `public/demo-viewer/`.

## Contributing Demos

Others are welcome to submit their demos via Pull Requests!

### Guidelines:
- **Solo Ranks Only:** The demo must be a valid solo rank ran on official KoG servers.
- **No Cheating:** Any demo found to be using cheats, macros, or external assistance will be rejected and removed.
- **Naming Convention:** Files in `public/demos/` must follow the format:
  `MapName_TimeInSeconds_PlayerName.demo`
  (e.g., `ExampleMap_123.456_Teero.demo`)

### How to PR:
1.  Add your `.demo` file to `public/demos/`.
2.  Run `python parse_maps.py` to update the data.
3.  Submit a Pull Request with your changes.

## License

This project is open-source, do whatever you want. [DDNet](https://github.com/ddnet/ddnet) is licensed under https://github.com/ddnet/ddnet/blob/master/license.txt. [twgpu](https://gitlab.com/ddnet-rs/twgpu) is licensed under https://gitlab.com/ddnet-rs/twgpu/-/blob/master/LICENSE

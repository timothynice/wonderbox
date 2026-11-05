"""Generate Wonderbox demo narration with local Voicebox presets (never a paid API).

Run Voicebox first, then:
  python3 scripts/narrate-demo.py --input docs/DEMO-NARRATION.json
"""
from pathlib import Path
import argparse
import json
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, default=Path('output/tutorial-voicebox'))
    parser.add_argument('--server', default='http://127.0.0.1:17493')
    parser.add_argument('--voice', default='af_heart')
    parser.add_argument('--profile-id', help='Reuse an existing Voicebox profile without changing or creating a voice.')
    parser.add_argument('--engine', help='Engine for an existing profile; defaults to its configured engine.')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    def request(path, data=None):
        body = None if data is None else json.dumps(data).encode()
        req = urllib.request.Request(args.server + path, data=body, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=60) as response:
            if response.headers.get_content_type() == 'text/event-stream':
                for line in response:
                    if line.startswith(b'data: '):
                        return json.loads(line[6:])
                raise RuntimeError('Voicebox closed its status stream without a state.')
            return json.load(response)

    request('/health')
    profiles = request('/profiles')
    name = f'Tutorial narrator — Kokoro {args.voice}'
    profile = next((p for p in profiles if p.get('id') == args.profile_id), None) if args.profile_id else next((p for p in profiles if p.get('name') == name and p.get('preset_voice_id') == args.voice), None)
    if args.profile_id and profile is None:
        raise ValueError(f'Voicebox profile not found: {args.profile_id}')
    if profile is None:
        profile = request('/profiles', {'name': name, 'description': 'Warm, conversational English narration for tutorials. Preset voice; no voice cloning.', 'language': 'en', 'voice_type': 'preset', 'preset_engine': 'kokoro', 'preset_voice_id': args.voice, 'default_engine': 'kokoro'})
    engine = args.engine or profile.get('default_engine') or 'kokoro'
    (args.output_dir / 'profile.json').write_text(json.dumps(profile, indent=2))
    segments = json.loads(args.input.read_text())
    for item in segments:
        destination = args.output_dir / f'{item["id"]}.wav'
        receipt = args.output_dir / f'{item["id"]}-generation.json'
        if destination.exists() and receipt.exists():
            saved = json.loads(receipt.read_text())
            if saved.get('text') == item['voice'] and saved.get('profile_id') == profile['id'] and saved.get('engine') == engine:
                print(f'Using saved narration: {item["id"]}', flush=True)
                continue
        pending = args.output_dir / f'{item["id"]}-pending.json'
        generation = json.loads(pending.read_text()) if pending.exists() else request('/generate', {'profile_id': profile['id'], 'engine': engine, 'language': 'en', 'text': item['voice'], 'normalize': False, 'max_chunk_chars': 800, 'crossfade_ms': 50, 'personality': False})
        pending.write_text(json.dumps(generation))
        generation_id = generation['id']
        print(f'Generating {item["id"]}: {generation_id}', flush=True)
        started = time.monotonic()
        while True:
            state = request(f'/history/{generation_id}')
            status = state.get('status')
            if status == 'completed': break
            if status in ['failed', 'cancelled', 'error']:
                raise RuntimeError(f'Voicebox {item["id"]} failed: {json.dumps(state)}')
            if time.monotonic() - started > 900:
                raise TimeoutError(f'Generation {generation_id} is still pending; inspect Voicebox before retrying.')
            time.sleep(2)
        with urllib.request.urlopen(args.server + f'/audio/{generation_id}', timeout=60) as response:
            destination.write_bytes(response.read())
        state.update({'profile_id': profile['id'], 'text': item['voice'], 'engine': engine, 'voice_id': profile.get('preset_voice_id')})
        receipt.write_text(json.dumps(state, indent=2))
        pending.unlink(missing_ok=True)
        print(f'Saved {item["id"]}: {destination.stat().st_size} bytes', flush=True)


if __name__ == '__main__':
    main()

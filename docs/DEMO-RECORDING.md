# Final narrated actual-app walkthrough

The local master is `output/playwright/final-demo/production/wonderbox-final-demo.mp4`: **2:47**, 1440×900, H.264 video and AAC stereo narration. It is a prepared walkthrough for owner review and Clips upload, not a published clip or a submission receipt.

The source is one completed actual-app take, `output/playwright/final-demo/take-1793858062229/raw.webm`, with timestamped screenshots and `evidence.json` beside it. It ran against a frozen local production server at `http://127.0.0.1:3003` using the genuine configured Gemini provider. All three application requests returned HTTP 200 (four genuine model calls in total); this take recorded no page errors or HTTP errors. No fixture provider, imported diagnostic project, runtime-state injection or teleport was used. The frozen server includes the final terrain no-op guard (confirmed through its read-only endpoint). A later activity-label wording change is absent from this server; validation and gameplay are the same.

The walkthrough shows:

1. The original garden, ordinary jumping and the optional ledge.
2. A genuine compound request for autumn, moonlight, crystal terrain, lavender/round/leaf/spotted Pip and 0.8-second float. Eight independent request checks, the preview, Apply and the actual art change are visible.
3. A real keyboard float landing at the original ledge, followed by Undo of the complete AI transaction.
4. A manual 0.65-second float setting and a genuine read-only agent answer from current authored state.
5. Original-character route checking, shared mechanical step options, the model proposal, Agent-Native activity, the checked route card, ghost terrain and explicit Apply.
6. The clearly labeled scripted-input replay in the actual game, a stable ledge landing, and Undo of the terrain transaction.

The edit shortens idle AI waiting time and holds some actual source frames under narration; an on-screen disclosure remains visible. It does not combine successful actions from different takes. The mechanical replay is not a human playtest. This compact take does not demonstrate the entire star/victory route, physical-phone testing, or every signature mechanic. Historical route evidence remains separate.

Narration uses the owner-approved **local Voicebox Kokoro Heart (`af_heart`)** preset. The original short sample, generation receipts and PCM checks remain in `output/voicebox-preflight`. The full narration, segment receipts, transcription checks, transcript, optional SRT and exact edit manifest are under `output/playwright/final-demo/production`. No paid speech API, system-speech substitution or voice cloning was used. Automated audio/transcription checks are distinct from the owner's final listening review.

Earlier failed raw takes are retained. One attempt encountered an HTTP 500 during a development-server restart window; that timing suggests a transient proxy/server interruption but does not establish the cause. Two capture attempts launched with excessive running momentum and missed the ledge. The recorder now lets actual horizontal velocity settle and focuses the canvas before jumping. These failures were not cut into an apparent uninterrupted successful take.

## Reproduce locally

Build and start a frozen production server in one terminal with `npm run build` followed by `PORT=3003 npm start`, then leave it running. Verify a real provider first. Recording creates a fresh browser project; it does not reset your personal saved project. Model calls use the configured provider's quota. Install Chromium with `npx playwright install chromium --no-shell`, then:

```sh
DEMO_URL=http://127.0.0.1:3003 node scripts/record-final-demo.mjs
```

The command prints its unique take directory. Keep `raw.webm` and `evidence.json`. If a request fails, resolve the actual error and record another complete take; do not replace model responses with fixtures.

Start the local Voicebox application, check the approved Heart sample, then generate the checked-in script with the already approved local preset:

```sh
python3 scripts/narrate-demo.py \
  --input docs/DEMO-NARRATION.json \
  --output-dir output/playwright/final-demo/production/voice \
  --server http://127.0.0.1:17493 \
  --profile-id 47aaff65-809f-4b3d-bca8-f2da8c076f0a \
  --engine kokoro
```

The preset ID is this workstation's approved local profile, not a provider credential. On another workstation create/select the same Kokoro `af_heart` preset or omit `--profile-id` to let the script select that preset. No server credentials belong in video scripts.

Install a working FFmpeg with H.264/AAC and `drawtext`, then render the successful take:

```sh
FFMPEG=/absolute/path/to/working/ffmpeg \
  python3 scripts/render-final-demo.py output/playwright/final-demo/take-TIMESTAMP
```

FFmpeg may also be on `PATH`; `FFMPEG` overrides it. This workstation's Homebrew binary had a missing x265 library, so the actual export used the existing static imageio-ffmpeg binary from the Brim video tool environment. That is an export-tool issue, not an app dependency. The renderer currently uses the standard macOS Helvetica font path for its small disclosure label.

`scripts/narrate-demo.py` is adapted from the pre-existing Brim `scripts/narrate-tutorial.py` local narration utility; it is tooling, not newly authored Wonderbox application code. The capture, render plan and Wonderbox narration are specific to this walkthrough. Voicebox/Kokoro and FFmpeg are external production tools, not bundled game assets.

Watch the finished video with sound before sharing. Then follow [CLIPS-GUIDE.md](CLIPS-GUIDE.md) to sign in, upload the MP4, explicitly choose Public and verify playback while signed out. Publication, rules acceptance and submission remain owner actions.

# Wonderbox · Clips recording and submission preparation

Prepared November 4, 2026. No Clips account was created, no terms accepted, no software installed, and no recording uploaded or published by the agent.

## Website or installation?

Start at **https://clips.agent-native.com** in a desktop browser. A separate installation is not necessary for the web-library/upload route. Official Clips documentation describes a built-in recorder, **Upload a video file**, and drag-and-drop upload. It also offers an optional desktop recorder and a Chrome extension for browser-debugging logs. See [Clips overview](https://www.agent-native.com/docs/template-clips/) and [features](https://www.agent-native.com/docs/template-clips-features/).

For this project, the simplest route is to watch the completed 2:47 narrated MP4 at `output/playwright/final-demo/production/wonderbox-final-demo.mp4`, then upload that actual-app recording to Clips. Its source, transcript and edit disclosures are documented in [DEMO-RECORDING.md](DEMO-RECORDING.md). You can instead rehearse the same sequence and record your own narration and app interaction in Clips. A locally saved MP4 alone is not a public Clips link.

## What was actually checked

In a fresh Chromium browser, the website displayed **Welcome to Clips**, **Sign in with Google**, an Email field and **Continue with email**. The page says account creation accepts its Terms and Privacy Policy, so account creation/sign-in remains your step. The authenticated Library, upload dialog and share settings were not operated; the labels below are verified in official documentation rather than claimed authenticated UI checks.

The anonymous [download page](https://clips.agent-native.com/download/) loaded and offered a macOS universal DMG, Windows MSI, Linux AppImage and optional Chrome extension. Nothing was downloaded. That page produced third-party analytics errors and an unauthenticated agent-status 401; these did not prevent its download options from rendering. They are Clips-site observations, not Wonderbox errors.

## Your recording/upload sequence

1. Open [Wonderbox](https://wonderbox-three.vercel.app) and follow the current [demo script](DEMO.md). AI access is public until **November 28 at midnight Pacific**; no code is needed before that cutoff.
2. Use a clean desktop browser at 1440×900 or larger. Close unrelated tabs, hide notifications, and keep API keys, terminal environment values and account screens out of the recording. Rehearse Reset demo, the live requests, manual adjustment, Undo and the checked-jump segment first.
3. Sign into Clips yourself. Choose **Upload a video file** from the Record/Import area and select the final narrated MP4. Alternatively choose Record and select the Wonderbox tab or window; enable your microphone only if you are speaking live. A prerecorded narration file should not be described as your live microphone.
4. If macOS/browser capture asks for permission, allow the selected screen/window and microphone as needed. The optional desktop recorder needs macOS Screen Recording permission under System Settings → Privacy & Security. No capture permissions are necessary merely to upload an existing file. Leave optional Rewind/earlier-screen-history capture off; it is unnecessary for this demo.
5. Wait for video processing and review the complete recording. Confirm the beginning, spoken explanation, actual AI results, readable changes, gameplay, Undo, and ending. If a wait or separate take was edited, retain the disclosure from the prepared walkthrough. Do not relabel browser touch emulation as a physical-phone recording.
6. Open Share and explicitly choose **Public**. Remove any password or expiry that would block judges; do not rely on the workspace's default visibility. Copy the public Clips URL. Official documentation distinguishes public, team/organization and private sharing, plus optional passwords/expiry. [Sharing reference](https://www.agent-native.com/docs/template-clips-features/#share)
7. Open that URL in a private/incognito window, signed out. Play the video with audio and seek near the end. It must require neither login nor an access request. Send the exact signed-out-playable Clips link in the submission.

## Submission packet

Use the public Clips link, https://wonderbox-three.vercel.app, https://github.com/timothynice/wonderbox, the project description in [HACKATHON.md](HACKATHON.md), [attribution](ATTRIBUTION.md), and your creator/contact details. Explain the shared Agent-Native inspection, validated transaction, preview, jump checking and Undo in the demo itself. The manual editor and AI operate on one authored project; runtime play remains separate.

The official deadline is **November 9, 2026, at 11:59 p.m. Pacific** (**November 10 at 12:59 a.m. Mountain**). The required demonstration is a **public Clips recording of the actual application**, viewable without login or an access request. Enter the submission form, personally accept the rules/confirm eligibility, submit, and confirm receipt. Uploading or recording a clip does not itself submit the entry. [Official rules](https://www.builder.io/hackathon/rules)

If sign-in, uploading or sharing is unavailable, retain the local finished MP4 and contact the organizers before the deadline; do not assume a GitHub or Vercel link substitutes for the required Clips link. No public clip or submission receipt exists until those human steps are complete.

## Narration preparation

The approved local narrator is Voicebox Kokoro **Heart (`af_heart`)**, reused from Brim. The local API at `http://127.0.0.1:17493` and existing preset profile were reachable during this check. A new 14.3-second Wonderbox sample is saved in `output/voicebox-preflight/sample.wav`, with generation receipt, local transcription and audio-level checks beside it. It is 24 kHz mono PCM with 0 clipped samples. No paid speech service, system-speech substitution or voice cloning was used. Final narration must be checked against the actual captured behavior and normalized during video export; sample generation is not proof of a completed full demo.

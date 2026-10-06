# Listening Loop

**Three places to pause. Six seconds to listen.** A small web app that gives you a reason to step outside, notice a soundscape and bring back a field journal.

Google's open YAMNet model runs entirely in the browser through TensorFlow.js. It suggests sound labels; your ears and written observations get the final say. No account, API key, GPS or audio uploads.

Built as a new project during the October 2026 DEV Hacktoberfest **Week 1: Touch Grass** challenge by Kanishq Sharma, with AI-assisted implementation, writing and testing disclosed.

## Take a listening walk

1. Open the app over HTTPS or on localhost. Press **Prepare for a walk** while online. The first preparation downloads about 19 MB of app and model files.
2. Wait for **Ready for offline listening** before disconnecting. Browser storage can be evicted; prepare again if necessary.
3. Choose a comfortable place to pause, name it and press **Listen for 6 seconds**. Microphone permission is requested only then.
4. Read the model's suggestions and write what you actually heard. Walk somewhere different and repeat until you have three stops.
5. Download the JSON journal. Optionally select **Remember this journal on this device**. **Forget saved journal** removes the saved copy.

The example birdsong is a credited public-domain recording and never creates a walk entry. Imported clips are explicitly marked as imported, not verified outdoor observations. Audio samples are not saved in journals or uploaded.

## Run locally

The repository includes the browser runtime and model assets; no package installation or paid service is needed to use it.

```sh
node scripts/serve.mjs
```

Open `http://127.0.0.1:4176`. The server uses Node's standard library. Alternatively serve this directory with any static HTTP server. Deploy the static files to an HTTPS host to allow microphone capture and offline caching. Paths are relative, so a GitHub Pages project subdirectory is supported.

## Open AI at the core

- **Model:** [Google YAMNet TFJS v1](https://www.kaggle.com/models/google/yamnet/TfJs/tfjs/1), Apache 2.0. MobileNet-based classification across 521 AudioSet event labels.
- **Input:** mono waveform at 16 kHz, between one and six seconds. Imported multichannel audio is averaged; common microphone sample rates are area-averaged to 16 kHz.
- **Inference:** model frame scores are averaged and sorted. Nature, People and City summaries use editable label groups and heuristic thresholds in `core.js`.
- **Uncertainty:** scores are not calibrated probabilities. Quiet, clipped or ambiguous recordings are labelled accordingly. This is not a species identifier, sound-level meter or safe-route guide.
- **Privacy:** static files are downloaded from the host; inference happens on the device. Recorded audio is temporary in-memory data. Only notes, sources and model suggestions can be saved or exported. The app has no analytics or audio upload endpoint.
- **Offline:** a service worker caches a fixed list of application and model files after preparation. Storage availability and eviction depend on the browser.

## Validation and limits

Unit tests cover resampling, audio validation, uncertain results and journal integrity:

```sh
npm test
```

Use Node 24 for these test commands. Browser integration tests need Playwright and its Chromium binary installed in your development environment and a running local server. `tests/browser.mjs` generates its silence fixture and tests the real model, permission denial, generated microphone capture and cancellation, imported audio, journal export/storage, offline reload and a 390px viewport. Its artifacts are local and excluded from Git.

```sh
npm install --no-save playwright@1.62.0
npx playwright install chromium
node tests/browser.mjs
```

The microphone integration test uses a generated MediaStream. It is not evidence of a physical microphone, phone or outdoor trial. Safari, physical phones, noisy outdoor recordings and long-term storage eviction require additional real-device testing. The model was trained on broad audio events; a short, quiet or overlapping recording can be wrong.

## Files and reuse

`audio.js` handles temporary capture and decoding. `model.js` loads and disposes inference tensors. `core.js` contains pure audio/journal logic. `app.js` connects them to the UI. `sw.js` handles static offline caching.

Original application code and artwork are MIT-licensed. Model weights, TensorFlow.js and the example recording retain their own licences; see [THIRD_PARTY.md](THIRD_PARTY.md). `model/provenance.json` records download sources and SHA-256 hashes. `scripts/prepare_assets.py` and `scripts/vendor.mjs` reproduce the public asset preparation.

Created by [Kanishq Sharma](https://kanishq.dev). AI assistance is part of the disclosed build workflow, not a claim that a human field trial occurred.

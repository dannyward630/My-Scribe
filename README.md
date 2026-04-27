# VidScribe

VidScribe is a local-first web app for turning video or audio into transcripts.

The site accepts either:

- a local media file upload, or
- a public video/audio URL

Then the Node API calls the Python transcriber, which uses FFmpeg, yt-dlp, and faster-whisper to return transcript text with timestamped segments.

## What is included

- React website UI
- File upload flow
- Public URL flow
- Quality presets:
  - Fast = `base`
  - Balanced = `small`
  - Accurate = `medium`
- Language auto-detect with optional language selection
- Copy transcript
- Save TXT, SRT, or VTT from the browser
- Recent transcription history stored in browser localStorage
- Python CLI that can also be run without the website

## Requirements

- Node.js and npm
- Python 3.10 or newer
- FFmpeg on PATH, or `ffmpeg.exe` in `tools/ffmpeg/`
- yt-dlp installed through Python requirements, on PATH, or `yt-dlp.exe` in `tools/yt-dlp/`

Install dependencies:

```powershell
npm install
py -3 -m pip install -r transcriber\requirements.txt
```

For a cleaner Python setup, use a virtual environment:

```powershell
py -3 -m venv transcriber\.venv
transcriber\.venv\Scripts\python -m pip install -r transcriber\requirements.txt
```

If you use a virtual environment, start the API with:

```powershell
$env:VIDSCRIBE_PYTHON="transcriber\.venv\Scripts\python.exe"
npm run server
```

## Run the website

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:8787
```

## CLI usage

Local file:

```powershell
py -3 transcriber\transcribe.py file "input.mp4" --quality balanced --language auto --out outputs
```

Public URL:

```powershell
py -3 transcriber\transcribe.py url "https://example.com/video" --quality balanced --language auto --out outputs
```

Output JSON:

```json
{
  "text": "Full transcript...",
  "segments": [
    {
      "start": 0.0,
      "end": 4.2,
      "text": "Hello and welcome..."
    }
  ],
  "outputs": {
    "txt": "outputs/transcript.txt",
    "srt": "outputs/transcript.srt",
    "vtt": "outputs/transcript.vtt"
  }
}
```

## Notes

Only transcribe content you have permission to process. Public links depend on yt-dlp support, so some sites may not work. DRM-protected streams are intentionally out of scope.

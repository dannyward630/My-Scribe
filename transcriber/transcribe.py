from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


QUALITY_MODELS = {
    "fast": "base",
    "balanced": "small",
    "accurate": "medium",
}


SUPPORTED_SUFFIXES = {
    ".mp4",
    ".mov",
    ".mkv",
    ".webm",
    ".avi",
    ".mp3",
    ".wav",
    ".m4a",
    ".flac",
}


@dataclass
class Segment:
    start: float
    end: float
    text: str


def progress(stage: str, message: str) -> None:
    print(json.dumps({"stage": stage, "message": message}), file=sys.stderr, flush=True)


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def app_data_dir() -> Path:
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        return Path(base) / "VidScribe"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "VidScribe"
    return Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "VidScribe"


def first_existing(paths: list[Path]) -> Path | None:
    for candidate in paths:
        if candidate.exists():
            return candidate
    return None


def resolve_executable(name: str, tool_subdir: str) -> str:
    exe_name = f"{name}.exe" if sys.platform == "win32" else name
    bundled = first_existing(
        [
            project_root() / "tools" / tool_subdir / exe_name,
            project_root() / "tools" / tool_subdir / name / exe_name,
        ]
    )
    if bundled:
        return str(bundled)

    found = shutil.which(name) or shutil.which(exe_name)
    if found:
        return found

    raise RuntimeError(
        f"{name} was not found. Install it on PATH or place {exe_name} in tools/{tool_subdir}."
    )


def run(command: list[str], stage: str) -> None:
    progress(stage, " ".join(command[:2]))
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(detail or f"Command failed: {' '.join(command)}")


def safe_stem(value: str) -> str:
    stem = "".join(char if char.isalnum() or char in ("-", "_") else "-" for char in value)
    stem = "-".join(part for part in stem.split("-") if part)
    return stem[:80] or "transcript"


def normalize_audio(input_path: Path, temp_dir: Path) -> Path:
    if input_path.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise RuntimeError(f"Unsupported media type: {input_path.suffix or 'unknown'}")

    ffmpeg = resolve_executable("ffmpeg", "ffmpeg")
    audio_path = temp_dir / "audio.wav"
    progress("extracting_audio", "Extracting 16 kHz mono audio...")
    run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            str(audio_path),
        ],
        "extracting_audio",
    )
    return audio_path


def download_url(url: str, temp_dir: Path) -> Path:
    output_template = str(temp_dir / "download.%(ext)s")
    progress("downloading", "Downloading best public audio...")

    try:
        yt_dlp = resolve_executable("yt-dlp", "yt-dlp")
        run(
            [
                yt_dlp,
                "--no-playlist",
                "-f",
                "bestaudio/best",
                "-o",
                output_template,
                url,
            ],
            "downloading",
        )
    except RuntimeError:
        progress("downloading", "Falling back to python -m yt_dlp...")
        run(
            [
                sys.executable,
                "-m",
                "yt_dlp",
                "--no-playlist",
                "-f",
                "bestaudio/best",
                "-o",
                output_template,
                url,
            ],
            "downloading",
        )

    downloads = [item for item in temp_dir.iterdir() if item.name.startswith("download.")]
    if not downloads:
        raise RuntimeError("yt-dlp did not produce a downloadable media file.")
    return downloads[0]


def transcribe(audio_path: Path, quality: str, language: str) -> list[Segment]:
    progress("loading_model", "Loading speech model...")
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed. Run: python -m pip install -r transcriber/requirements.txt"
        ) from exc

    model_name = QUALITY_MODELS[quality]
    model_dir = app_data_dir() / "models"
    model_dir.mkdir(parents=True, exist_ok=True)

    model = WhisperModel(
        model_name,
        device="cpu",
        compute_type="int8",
        download_root=str(model_dir),
    )

    progress("transcribing", "Transcribing audio...")
    kwargs: dict[str, Any] = {"vad_filter": True}
    if language != "auto":
        kwargs["language"] = language

    segments, _info = model.transcribe(str(audio_path), **kwargs)
    return [Segment(start=float(item.start), end=float(item.end), text=item.text.strip()) for item in segments]


def timestamp(seconds: float, separator: str = ",") -> str:
    milliseconds = round((seconds - int(seconds)) * 1000)
    total = int(seconds)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}{separator}{milliseconds:03d}"


def write_outputs(segments: list[Segment], out_dir: Path, stem: str) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    text = "\n".join(segment.text for segment in segments).strip()
    txt = out_dir / f"{stem}.txt"
    srt = out_dir / f"{stem}.srt"
    vtt = out_dir / f"{stem}.vtt"

    progress("writing_outputs", "Writing TXT, SRT, and VTT...")
    txt.write_text(text + "\n", encoding="utf-8")

    srt.write_text(
        "\n".join(
            f"{index}\n{timestamp(segment.start)} --> {timestamp(segment.end)}\n{segment.text}\n"
            for index, segment in enumerate(segments, start=1)
        ),
        encoding="utf-8",
    )

    vtt.write_text(
        "WEBVTT\n\n"
        + "\n".join(
            f"{index}\n{timestamp(segment.start, '.') } --> {timestamp(segment.end, '.')}\n{segment.text}\n"
            for index, segment in enumerate(segments, start=1)
        ),
        encoding="utf-8",
    )

    return {"txt": str(txt), "srt": str(srt), "vtt": str(vtt)}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="VidScribe local transcription CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_common(subparser: argparse.ArgumentParser) -> None:
        subparser.add_argument("--quality", choices=sorted(QUALITY_MODELS), default="balanced")
        subparser.add_argument("--language", default="auto")
        subparser.add_argument("--out", default=str(project_root() / "outputs"))
        subparser.add_argument("--stem", default="")

    file_parser = subparsers.add_parser("file", help="Transcribe a local media file")
    file_parser.add_argument("path")
    add_common(file_parser)

    url_parser = subparsers.add_parser("url", help="Transcribe a public media URL")
    url_parser.add_argument("url")
    add_common(url_parser)

    return parser


def main() -> int:
    args = build_parser().parse_args()
    out_dir = Path(args.out).expanduser().resolve()

    with tempfile.TemporaryDirectory(prefix="vidscribe-") as temp:
        temp_dir = Path(temp)
        if args.command == "file":
            source = Path(args.path).expanduser().resolve()
            if not source.exists():
                raise RuntimeError(f"File not found: {source}")
            stem = safe_stem(args.stem or source.stem)
            media_path = source
        else:
            stem = safe_stem(args.stem or args.url.split("/")[-1] or "url-transcript")
            media_path = download_url(args.url, temp_dir)

        audio_path = normalize_audio(media_path, temp_dir)
        segments = transcribe(audio_path, args.quality, args.language)
        outputs = write_outputs(segments, out_dir, stem)
        result = {
            "text": "\n".join(segment.text for segment in segments).strip(),
            "segments": [segment.__dict__ for segment in segments],
            "outputs": outputs,
        }
        print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)

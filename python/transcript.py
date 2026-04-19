#!/usr/bin/env python3
"""
Fetches a YouTube transcript and outputs clean JSON to data/transcript.json.

Usage:
    python python/transcript.py --url "https://www.youtube.com/watch?v=VIDEO_ID"
    python python/transcript.py --url "VIDEO_ID"
"""

import argparse
import json
import os
import re
import sys
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled


def extract_video_id(url_or_id: str) -> str:
    """Extract the video ID from a URL or return as-is if already an ID."""
    patterns = [
        r"(?:v=|youtu\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    # Assume it's already a bare video ID
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", url_or_id):
        return url_or_id
    print(f"Error: Could not extract a valid video ID from: {url_or_id}", file=sys.stderr)
    sys.exit(1)


def fetch_transcript(video_id: str) -> list[dict]:
    """Fetch transcript, preferring English. Returns list of {text, start, duration}."""
    api = YouTubeTranscriptApi()
    try:
        transcript_list = api.list(video_id)
    except TranscriptsDisabled:
        print("Error: Transcripts are disabled for this video.", file=sys.stderr)
        sys.exit(1)

    # Try manually-created English first, then auto-generated English, then anything
    try:
        transcript = transcript_list.find_manually_created_transcript(["en", "en-US", "en-GB"])
    except NoTranscriptFound:
        try:
            transcript = transcript_list.find_generated_transcript(["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            # Fall back to first available language
            transcript = next(iter(transcript_list))
            print(f"Warning: No English transcript found. Using: {transcript.language} ({transcript.language_code})", file=sys.stderr)

    fetched = transcript.fetch()
    return [
        {
            "text": entry.text,
            "start": round(entry.start, 3),
            "duration": round(entry.duration, 3),
        }
        for entry in fetched
    ]


def main():
    parser = argparse.ArgumentParser(description="Fetch YouTube transcript to JSON")
    parser.add_argument("--url", required=True, help="YouTube URL or video ID")
    parser.add_argument("--out", default="data/transcript.json", help="Output file path")
    args = parser.parse_args()

    video_id = extract_video_id(args.url)
    print(f"Fetching transcript for video ID: {video_id}")

    entries = fetch_transcript(video_id)
    print(f"Fetched {len(entries)} transcript entries")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    output = {
        "video_id": video_id,
        "entry_count": len(entries),
        "transcript": entries,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Transcript written to: {args.out}")


if __name__ == "__main__":
    main()

#!/bin/bash
# 원본 영상 -> 웹용 720p MP4.
# mobile-flow.720.mp4 를 만든 것과 같은 방식(avconvert, macOS 기본 내장)이다.
#
#   ./build/video.sh ~/Desktop/solution02.mov sol02-flow
#   ./build/video.sh ~/Desktop/solution03.mov sol03-flow
#
# 결과는 assets/video/attracker/<이름>.720.mp4 로 떨어진다.
set -euo pipefail

src="${1:?원본 영상 경로를 넘겨주세요}"
name="${2:?출력 이름을 넘겨주세요 (예: sol02-flow)}"
dir="$(cd "$(dirname "$0")/.." && pwd)/assets/video/attracker"
out="$dir/$name.720.mp4"

mkdir -p "$dir"
avconvert --source "$src" --preset Preset1280x720 --output "$out" --replace
printf '%s  (%s)\n' "$out" "$(du -h "$out" | cut -f1)"

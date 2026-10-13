#!/bin/bash
# 원본 영상 -> 웹용 1600px MP4 (H.264 · 30fps · 무음).
# toss.tech 블로그 영상과 같은 무게(가로 1574~2048px, 1개 1~3MB)에 맞춘 값이다.
# ffmpeg 가 필요하다: brew install ffmpeg
#
#   ./build/video.sh ~/Desktop/영상/1.mp4 sol02-flow
#   ./build/video.sh ~/Desktop/영상/2.mp4 sol03-flow
#
# 결과는 assets/video/attracker/<이름>.1600.mp4 로 떨어진다.
set -euo pipefail

src="${1:?원본 영상 경로를 넘겨주세요}"
name="${2:?출력 이름을 넘겨주세요 (예: sol02-flow)}"
dir="$(cd "$(dirname "$0")/.." && pwd)/assets/video/attracker"
out="$dir/$name.1600.mp4"

mkdir -p "$dir"
ffmpeg -y -v error -i "$src" -an \
  -vf "scale=1600:-2:flags=lanczos,fps=30" \
  -c:v libx264 -preset slow -crf 24 -tune animation \
  -pix_fmt yuv420p -profile:v high -movflags +faststart "$out"
printf '%s  (%s)\n' "$out" "$(du -h "$out" | cut -f1)"

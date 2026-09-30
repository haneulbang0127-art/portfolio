#!/usr/bin/env python3
"""페이지를 파일 하나로 묶는다 — 서버 없이 더블클릭으로 열린다.

- CSS, 로컬 JS, 이미지(아이콘 포함)를 전부 인라인
- 동영상은 base64로 박으면 탐색·스트리밍이 망가져서 파일로 복사한다
- 폰트와 three.js는 CDN 링크 그대로 (인터넷 연결 시 원본과 동일하게 보인다)
- 페이지끼리의 링크(main.html ↔ work-attracker.html)는 이름을 유지해
  같은 폴더에 두면 그대로 동작한다

사용법:  python3 build/standalone.py [출력폴더]
기본 출력: ./dist
"""
import re, os, sys, base64, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE) + '/'
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, 'dist')

PAGES = ['main.html', 'work-attracker.html']

MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.avif': 'image/avif'}

# 인라인하지 않고 그대로 복사하는 것들 (용량이 크고 스트리밍이 필요하다)
COPY_EXT = {'.mp4', '.webm', '.mov', '.m4v', '.ogg', '.mp3', '.wav'}
copied = set()


def datauri(path):
    ext = os.path.splitext(path)[1].lower()
    if ext not in MIME:
        raise SystemExit('지원하지 않는 이미지 형식: ' + path)
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(f.read()).decode())


def inline_css(css, css_dir):
    """CSS 안의 url(...)을 data URI로. 원격 주소는 건드리지 않는다."""
    n = [0]

    def repl(m):
        ref = m.group(1).strip('\'"')
        if ref.startswith(('data:', 'http://', 'https://', '//', '#')):
            return m.group(0)
        p = os.path.normpath(os.path.join(css_dir, ref))
        if not os.path.exists(p):
            raise SystemExit('css 참조 없음: ' + ref)
        n[0] += 1
        return 'url("%s")' % datauri(p)

    return re.sub(r'url\(\s*([^)]+?)\s*\)', repl, css), n[0]


def build(page):
    html = open(SITE + page, encoding='utf-8').read()
    counts = {'css': 0, 'cssurl': 0, 'img': 0, 'js': 0, 'copy': 0}

    def css_link(m):
        href = m.group(1)
        if href.startswith(('http://', 'https://', '//')):
            return m.group(0)              # 폰트 CDN은 그대로
        p = SITE + href
        if not os.path.exists(p):
            raise SystemExit('css 없음: ' + href)
        css = open(p, encoding='utf-8').read()
        css, k = inline_css(css, os.path.dirname(p))
        counts['css'] += 1
        counts['cssurl'] += k
        return '<style>\n/* ==== %s ==== */\n%s\n</style>' % (href, css)

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>', css_link, html)

    def js(m):
        rel = m.group(1)
        if rel.startswith(('http://', 'https://', '//')):
            return m.group(0)              # three.js CDN은 그대로
        p = SITE + rel
        if not os.path.exists(p):
            raise SystemExit('js 없음: ' + rel)
        code = open(p, encoding='utf-8').read()
        if '</script' in code.lower():
            raise SystemExit('js에 </script 있음: ' + rel)
        counts['js'] += 1
        return '<script>\n/* ==== %s ==== */\n%s\n</script>' % (rel, code)

    html = re.sub(r'<script src="([^"]+)"[^>]*></script>', js, html)

    def asset(m):
        attr, ref = m.group(1), m.group(2)
        if ref.startswith(('data:', 'http://', 'https://', '//')):
            return m.group(0)
        p = SITE + ref
        if not os.path.exists(p):
            raise SystemExit('에셋 없음: ' + ref)
        if os.path.splitext(ref)[1].lower() in COPY_EXT:
            dst = os.path.join(OUT_DIR, ref)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(p, dst)
            copied.add(ref)
            counts['copy'] += 1
            return m.group(0)              # 상대 경로 유지
        counts['img'] += 1
        return '%s="%s"' % (attr, datauri(p))

    # src 뿐 아니라 video의 poster도 포함
    html = re.sub(r'\b(src|poster)="(assets/[^"]+)"', asset, html)


    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, page)
    open(out, 'w', encoding='utf-8').write(html)

    leftover = sorted(set(
        r for r in re.findall(r'(?:src|href)="([^"]+)"', html)
        if not r.startswith(('data:', 'http://', 'https://', '//', '#', 'mailto:'))
        and not r.endswith('.html') and r not in copied))

    print('%-22s css %d (url %d) · 이미지 %d · js %d · 복사 %d · %.0f KB'
          % (page, counts['css'], counts['cssurl'], counts['img'], counts['js'],
             counts['copy'], len(html.encode()) / 1024))
    if leftover:
        print('   남은 로컬 참조:', leftover)
    return out


if __name__ == '__main__':
    for p in PAGES:
        build(p)
    if copied:
        print('같은 폴더에 함께 둬야 하는 파일:', sorted(copied))
    print('→', OUT_DIR)

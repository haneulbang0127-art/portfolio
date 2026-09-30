#!/usr/bin/env python3
"""페이지를 Artifact로 올릴 수 있는 형태로 묶는다.

Artifact는 CSP가 빡빡하다:
- 스크립트는 cdnjs만 허용 → three.js는 그대로 두고
- 스타일시트는 Google Fonts만 허용 → Pretendard(jsdelivr /gh/)는 막히므로
  build/fonts-embed.css(base64)로 대체  ← subset.py로 생성
- 그 외 이미지·CSS·JS는 전부 인라인
- 동영상은 인라인하지 않고 같은 이름으로 함께 올린다(supporting file)
- 메인 페이지는 Artifact가 doctype/html/head/body를 감싸주므로 넣지 않는다
- 지원 파일로 올라가는 페이지는 그대로 서빙되므로 완전한 문서로 만든다

사용법:  python3 build/artifact.py [출력폴더]
기본 출력: ./dist-artifact
"""
import re, os, sys, base64, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE) + '/'
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, 'dist-artifact')

# (파일명, 완전한 문서로 만들지) — 지원 파일은 감싸주는 게 없어 True
PAGES = [('main.html', False), ('work-attracker.html', True)]

MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.avif': 'image/avif'}
COPY_EXT = {'.mp4', '.webm', '.mov', '.m4v', '.ogg', '.mp3', '.wav'}

copied = set()


def datauri(path):
    ext = os.path.splitext(path)[1].lower()
    if ext not in MIME:
        raise SystemExit('지원하지 않는 이미지 형식: ' + path)
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(f.read()).decode())


def inline_css_urls(css, css_dir):
    def repl(m):
        ref = m.group(1).strip('\'"')
        if ref.startswith(('data:', 'http://', 'https://', '//', '#')):
            return m.group(0)
        p = os.path.normpath(os.path.join(css_dir, ref))
        if not os.path.exists(p):
            raise SystemExit('css 참조 없음: ' + ref)
        return 'url("%s")' % datauri(p)

    return re.sub(r'url\(\s*([^)]+?)\s*\)', repl, css)


def build(page, fonts, full_doc=False):
    html = open(SITE + page, encoding='utf-8').read()

    title = re.search(r'<title>(.*?)</title>', html, re.S)
    title = title.group(1).strip() if title else page

    # head의 스타일시트 링크 수집 — 로컬은 인라인, Google Fonts만 남긴다
    keep_links, local_css = [], []
    for m in re.finditer(r'<link rel="stylesheet" href="([^"]+)"\s*/?>', html):
        href = m.group(1)
        if href.startswith('https://fonts.googleapis.com'):
            keep_links.append(m.group(0))
        elif href.startswith(('http://', 'https://', '//')):
            pass                                   # jsdelivr 폰트 등 — CSP에 막히므로 버린다
        else:
            p = SITE + href
            if not os.path.exists(p):
                raise SystemExit('css 없음: ' + href)
            local_css.append((href, inline_css_urls(
                open(p, encoding='utf-8').read(), os.path.dirname(p))))

    body = html[html.index('<body>') + 6:html.rindex('</body>')]

    def js(m):
        rel = m.group(1)
        if rel.startswith(('http://', 'https://', '//')):
            return m.group(0)                      # cdnjs three.js는 그대로
        p = SITE + rel
        if not os.path.exists(p):
            raise SystemExit('js 없음: ' + rel)
        code = open(p, encoding='utf-8').read()
        if '</script' in code.lower():
            raise SystemExit('js에 </script 있음: ' + rel)
        return '<script>\n/* ==== %s ==== */\n%s\n</script>' % (rel, code)

    body = re.sub(r'<script src="([^"]+)"[^>]*></script>', js, body)

    def asset(m):
        attr, ref = m.group(1), m.group(2)
        p = SITE + ref
        if not os.path.exists(p):
            raise SystemExit('에셋 없음: ' + ref)
        if os.path.splitext(ref)[1].lower() in COPY_EXT:
            dst = os.path.join(OUT_DIR, ref)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(p, dst)
            copied.add(ref)
            return m.group(0)                      # 같이 올리고 상대경로 유지
        return '%s="%s"' % (attr, datauri(p))

    body = re.sub(r'\b(src|poster)="(assets/[^"]+)"', asset, body)

    style = '<style>\n/* ==== 폰트 (base64) ==== */\n' + fonts
    for href, css in local_css:
        style += '\n/* ==== %s ==== */\n%s' % (href, css)
    style += '\n</style>'

    head = '<title>%s</title>\n%s\n%s' % (title, '\n'.join(keep_links), style)
    if full_doc:
        out = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n'
               '<meta charset="UTF-8" />\n'
               '<meta name="viewport" content="width=device-width, initial-scale=1, '
               'viewport-fit=cover" />\n'
               '%s\n</head>\n<body>%s</body>\n</html>\n') % (head, body)
    else:
        out = '%s\n%s\n' % (head, body)

    os.makedirs(OUT_DIR, exist_ok=True)
    dest = os.path.join(OUT_DIR, page)
    open(dest, 'w', encoding='utf-8').write(out)

    leftover = sorted(set(
        r for r in re.findall(r'(?:src|href)="([^"]+)"', out)
        if not r.startswith(('data:', 'https://', '#', 'mailto:'))
        and not r.endswith('.html') and r not in copied))
    inner = out[out.index('<style>') + 7:out.index('</style>')]

    print('%-22s css %d · @font-face %d · 중괄호 %d · %.1f MB'
          % (page, len(local_css), out.count('@font-face'),
             inner.count('{') - inner.count('}'), len(out.encode()) / 1048576))
    if leftover:
        print('   남은 로컬 참조:', leftover)
    return dest


if __name__ == '__main__':
    fonts_path = os.path.join(HERE, 'fonts-embed.css')
    if not os.path.exists(fonts_path):
        raise SystemExit('fonts-embed.css 없음 — 먼저 python3 build/subset.py 실행')
    fonts = open(fonts_path, encoding='utf-8').read()

    for p, full in PAGES:
        build(p, fonts, full)
    if copied:
        print('함께 올릴 파일:', sorted(copied))
    print('→', OUT_DIR)

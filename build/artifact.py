#!/usr/bin/env python3
"""main.html을 파일 하나로 묶어 아티팩트로 낼 수 있게 만든다.

- CSS·답변 데이터·아이콘·이미지를 모두 인라인
- 폰트는 build/fonts-embed.css(base64)를 사용  ← subset.py로 생성
- three.js 같은 원격 CDN 스크립트는 그대로 둔다 (아티팩트 CSP가 cdnjs 허용)
- main.css의 jsdelivr @font-face는 제거 (CSP상 폰트 파일이 막혀 인라인본을 덮어버림)

사용법:  python3 build/artifact.py [출력경로]
"""
import re, os, sys, base64

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE) + '/'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'artifact-main.html')

HEAD = '''<title>조하늘 · Product Designer</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;450;500;600;700;800&family=Cormorant+Garamond:wght@700&display=swap" />
'''


MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.avif': 'image/avif'}


def datauri(path):
    """확장자로 MIME을 정한다. 전부 svg로 박으면 PNG 카드 이미지가 깨진다."""
    ext = os.path.splitext(path)[1].lower()
    if ext not in MIME:
        raise SystemExit('지원하지 않는 이미지 형식: ' + path)
    return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(open(path, 'rb').read()).decode())


def main():
    fonts_path = os.path.join(HERE, 'fonts-embed.css')
    if not os.path.exists(fonts_path):
        raise SystemExit('fonts-embed.css 없음 — 먼저 python3 build/subset.py 실행')

    fonts = open(fonts_path, encoding='utf-8').read()
    css = open(SITE + 'assets/css/main.css', encoding='utf-8').read()
    html = open(SITE + 'main.html', encoding='utf-8').read()

    css, n_ff = re.subn(r'@font-face\s*\{[^}]*jsdelivr[^}]*\}\s*', '', css, flags=re.S)

    def css_icon(m):
        p = SITE + 'assets/icons/' + m.group(1)
        if not os.path.exists(p):
            raise SystemExit('css 아이콘 없음: ' + m.group(1))
        return 'url("%s")' % datauri(p)

    css, n_icon = re.subn(r'url\(\s*["\']?\.\./icons/([^"\')]+)["\']?\s*\)', css_icon, css)

    body = html[html.index('<body>') + 6:html.rindex('</body>')]

    def img(m):
        p = SITE + 'assets/' + m.group(1)
        if not os.path.exists(p):
            raise SystemExit('이미지 없음: ' + m.group(1))
        return 'src="%s"' % datauri(p)

    body, n_img = re.subn(r'src="assets/([^"]+)"', img, body)

    def js(m):
        rel = m.group(1)
        if rel.startswith(('http://', 'https://', '//')):
            return m.group(0)          # 원격 CDN은 그대로
        p = SITE + rel
        if not os.path.exists(p):
            raise SystemExit('js 없음: ' + rel)
        code = open(p, encoding='utf-8').read()
        if '</script' in code.lower():
            raise SystemExit('js에 </script 있음: ' + rel)
        return '<script>\n/* ==== %s (inlined) ==== */\n%s\n</script>' % (rel, code)

    body, _ = re.subn(r'<script src="([^"]+)"></script>', js, body)

    out = HEAD + '<style>\n' + fonts + '\n' + css + '\n</style>\n' + body + '\n'
    open(OUT, 'w', encoding='utf-8').write(out)

    style = out[out.index('<style>') + 7:out.index('</style>')]
    leftover = sorted(set(re.findall(r'(?:src|href)="(?!data:|https:|#)([^"]{0,60})"', out)))

    print('jsdelivr @font-face 제거 %d | 아이콘 %d | 이미지 %d' % (n_ff, n_icon, n_img))
    print('@font-face %d | 중괄호 균형 %d | %.1f KB'
          % (out.count('@font-face'), style.count('{') - style.count('}'), len(out.encode()) / 1024))
    print('남은 로컬 참조:', leftover)
    print('→', OUT)


if __name__ == '__main__':
    main()

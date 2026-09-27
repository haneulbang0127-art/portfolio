#!/usr/bin/env python3
"""화면에 실제로 쓰이는 문자만 골라 Pretendard 서브셋 + Gmarket Sans를
base64로 박은 fonts-embed.css를 만든다. 아티팩트는 파일 하나로 동작해야 해서
폰트를 외부에서 못 불러온다(CSP상 jsdelivr 폰트 파일이 막힘).

사용법:  python3 build/subset.py [캐시디렉터리]
기본 캐시: 환경변수 PORTFOLIO_FONT_CACHE 또는 ./.fontcache
"""
import re, os, sys, base64, subprocess, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE) + '/'
CACHE = (sys.argv[1] if len(sys.argv) > 1
         else os.environ.get('PORTFOLIO_FONT_CACHE', os.path.join(HERE, '.fontcache')))

PRETENDARD_CSS = ('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9'
                  '/dist/web/variable/pretendardvariable-dynamic-subset.min.css')
GMARKET = ('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1'
           '/GmarketSansMedium.woff')


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['curl', '-sS', '-fL', '-o', path, url], check=True)


def strip_comments(js):
    js = re.sub(r'/\*[\s\S]*?\*/', '', js)
    return re.sub(r'(^|\s)//[^\n]*', '', js)


def quoted(js):
    """따옴표 문자열 리터럴만 — 코드 식별자·주석은 화면에 안 나온다"""
    out = []
    for m in re.finditer(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", js):
        out.append(m.group(1) or m.group(2) or '')
    return ' '.join(out)


def used_chars():
    html = open(SITE + 'main.html', encoding='utf-8').read()

    body = re.sub(r'<script[\s\S]*?</script>', '', html)
    body = re.sub(r'<style[\s\S]*?</style>', '', body)
    text = H.unescape(re.sub(r'<[^>]+>', ' ', body))

    inline = ''.join(re.findall(r'<script>([\s\S]*?)</script>', html))
    text += ' ' + quoted(strip_comments(inline))
    text += ' ' + quoted(strip_comments(open(SITE + 'data/answers.js', encoding='utf-8').read()))

    return {ord(c) for c in text if ord(c) > 0x20}


def parse_range(spec):
    out = set()
    for part in spec.split(','):
        part = part.strip().replace('U+', '').replace('u+', '')
        if '-' in part:
            a, b = part.split('-')
            out |= set(range(int(a, 16), int(b, 16) + 1))
        elif '?' in part:
            out |= set(range(int(part.replace('?', '0'), 16),
                             int(part.replace('?', 'f'), 16) + 1))
        else:
            out.add(int(part, 16))
    return out


def main():
    css_path = os.path.join(CACHE, 'pretendard.css')
    gm_path = os.path.join(CACHE, 'GmarketSansMedium.woff')
    fetch(PRETENDARD_CSS, css_path)
    fetch(GMARKET, gm_path)

    codes = used_chars()
    blocks = re.findall(r'@font-face\{[^}]*\}', open(css_path, encoding='utf-8').read())

    needed = []
    for b in blocks:
        rng = re.search(r'unicode-range:([^;}]+)', b)
        url = re.search(r'url\(([^)]+)\)', b)
        if rng and url and codes & parse_range(rng.group(1)):
            needed.append((b, url.group(1).strip('"\'')))

    out = []
    for i, (block, url) in enumerate(needed):
        if url.startswith('/'):
            url = 'https://cdn.jsdelivr.net' + url
        elif not url.startswith('http'):
            url = ('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9'
                   '/dist/web/variable/' + url)
        chunk = os.path.join(CACHE, 'chunks', '%02d.woff2' % i)
        fetch(url, chunk)
        b64 = base64.b64encode(open(chunk, 'rb').read()).decode()
        out.append(re.sub(r'url\([^)]+\)',
                          'url(data:font/woff2;base64,' + b64 + ')', block, count=1))

    gm = base64.b64encode(open(gm_path, 'rb').read()).decode()
    out.append('@font-face {\n  font-family: "Gmarket Sans";\n'
               '  src: url("data:font/woff;base64,%s") format("woff");\n'
               '  font-weight: 500;\n  font-style: normal;\n  font-display: swap;\n}' % gm)

    dest = os.path.join(HERE, 'fonts-embed.css')
    open(dest, 'w', encoding='utf-8').write('\n'.join(out) + '\n')

    print('문자 %d자 / 조각 %d개 중 %d개 사용' % (len(codes), len(blocks), len(needed)))
    print('%s (%.1f KB)' % (dest, os.path.getsize(dest) / 1024))


if __name__ == '__main__':
    main()

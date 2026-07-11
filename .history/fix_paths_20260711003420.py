from pathlib import Path
import os
import re
from urllib.parse import quote

root = Path(r'C:\Users\user\Downloads\MSASIT').resolve()
html_files = [p for p in root.rglob('*.html') if p.is_file()]

for html_file in html_files:
    text = html_file.read_text(encoding='utf-8')
    original = text

    def repl(match):
        prefix, url, suffix = match.groups()
        if not url.startswith('/') or url.startswith('//'):
            return match.group(0)

        raw = url[1:].rstrip('/')
        if not raw:
            target_path = root / 'index.html'
        else:
            target_path = None
            candidates = [root / raw, root / raw / 'index.html', root / f'{raw}.html']
            for cand in candidates:
                if cand.exists():
                    target_path = cand
                    break
            if target_path is None:
                return match.group(0)

        current_dir = html_file.parent.resolve()
        rel = os.path.relpath(target_path, current_dir).replace('\\', '/')

        if target_path.name == 'index.html':
            rel = os.path.relpath(target_path.parent, current_dir).replace('\\', '/')
            if rel == '.':
                rel = './'
            else:
                rel = rel + '/'
        elif rel.endswith('.html'):
            rel = rel[:-5]
            if not rel.endswith('/'):
                rel = rel + '/'

        rel = quote(rel, safe='/.%')
        if rel in ('', '.'):
            rel = './'
        return f'{prefix}{rel}{suffix}'

    text = re.sub(r'((?:href|src|action)=("\'))(/[^"\']*)(\2)', repl, text)
    text = re.sub(r'((?:content)=("\'))(/[^"\']*)(\2)', repl, text)

    if text != original:
        html_file.write_text(text, encoding='utf-8')

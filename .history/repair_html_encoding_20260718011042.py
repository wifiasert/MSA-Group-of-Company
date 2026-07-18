from pathlib import Path
import re

root = Path('.')
replacements = {
    'â˜°': '☰',
    'âŒ•': '⌕',
    'â—': '◐',
    'Ã—': '×',
    'â€“': '–',
    'â€”': '—',
    'â€¢': '•',
    'ï¸': '',
    'ðŸ': '',
    'â˜': '',
    'âš™': '',
    'âœ¨': '',
    'â™': '',
    'â”Š': '',
    'âŒŠ': '',
    'âž': '',
    'â˜': '',
}
pattern = re.compile('|'.join(re.escape(k) for k in replacements))
changed_files = []
for path in sorted(root.rglob('*.html')):
    if '.history' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    new_text = pattern.sub(lambda m: replacements[m.group(0)], text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        changed_files.append(path)
for path in changed_files:
    print(path)
print('changed', len(changed_files))

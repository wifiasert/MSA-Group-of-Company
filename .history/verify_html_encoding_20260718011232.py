from pathlib import Path
import re

root = Path('.')
pattern = re.compile(r'â˜°|âŒ•|â—|Ã—|â€“|â€”|â€¢|ðŸ|ï¸|â˜|âš™|â˜|âž|Â|Ã')
remaining = []
for path in sorted(root.rglob('*.html')):
    if '.history' in path.parts:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    if pattern.search(text):
        remaining.append(path)

print('Remaining files:', len(remaining))
for path in remaining:
    print(path)
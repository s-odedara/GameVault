import os
import glob
import re

fallback_code = r''' onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found"; }} '''

files = glob.glob('frontend/src/pages/*.jsx') + glob.glob('frontend/src/*.jsx')

count = 0
for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will use regex to find `<img ` that doesn't already have `onError`
    # This regex is simple but effective enough for this purpose
    # We replace `<img ` with `<img onError={...} `
    
    # First, let's just do a simple replace, but avoid duplicating if already present
    if '<img ' in content and 'onError={' not in content:
        content = content.replace('<img ', f'<img {fallback_code}')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1
        print(f"Updated {file_path}")

print(f"Total files updated with image fallback: {count}")

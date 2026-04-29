import shutil
import os

# List of files to rewrite without BOM
files = [
    'demo/action.json',
    'demo/contract.json'
]

for path in files:
    # Read as binary, skip BOM if present
    with open(path, 'rb') as f:
        data = f.read()
    # Remove UTF-8 BOM if present
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
    # Write back as plain UTF-8
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Rewritten {path} as plain UTF-8 (no BOM)')

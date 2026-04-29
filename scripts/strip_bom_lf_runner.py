import pathlib
for path in ['scripts/audited_runner.sh']:
    p = pathlib.Path(path)
    data = p.read_bytes()
    # Remove BOM if present
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
    # Convert to LF only
    data = data.replace(b'\r\n', b'\n').replace(b'\r', b'\n')
    p.write_bytes(data)
    print(f'Rewritten {path} as plain UTF-8, LF, no BOM')

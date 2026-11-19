#!/usr/bin/env python3
"""Download a previously captured public WordPress media inventory with curl."""
import concurrent.futures, json, os, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse, unquote

urls = set(json.loads(Path(sys.argv[1]).read_text()))
root = Path('public').resolve()

def download(url):
    parsed = urlparse(url)
    if parsed.hostname != 'zhwe.top' or not parsed.path.startswith('/wp-content/uploads/'):
        return (url, 'unsupported URL')
    target = (root / unquote(parsed.path).lstrip('/')).resolve()
    if not target.is_relative_to(root):
        return (url, 'unsafe path')
    if target.exists() and target.stat().st_size:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(target.name + '.part')
    result = subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '90', url, '-o', str(tmp)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if result.returncode or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        return (url, f'curl exit {result.returncode}')
    os.replace(tmp, target)
    return None

failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
    for i, result in enumerate(executor.map(download, sorted(urls)), 1):
        if result: failures.append(result)
        if i % 250 == 0: print(f'{i}/{len(urls)} files checked; {len(failures)} failed',flush=True)
Path('/private/tmp/zhwe-media-failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2))
print(f'Finished: {len(urls)} URLs, {len(failures)} failures',flush=True)

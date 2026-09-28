#!/usr/bin/env python3
"""Reproduce both 3000 × 1000 PNGs with installed headless Google Chrome.

Standard library only. All browser profiles and logs stay beside this script.
Pass a or b to render only one concept; omit the argument to render both.
"""
from pathlib import Path
import os
import signal
import struct
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent
CHROME = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')


def render(concept):
    output = ROOT / f'concept-{concept}.png'
    log = ROOT / f'.render-{concept}.log'
    output.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix='.chrome-render-', dir=ROOT) as profile:
        args = [str(CHROME), '--headless=new', '--disable-gpu',
                '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                '--disable-background-networking', '--disable-component-update',
                f'--user-data-dir={profile}', '--force-device-scale-factor=2',
                '--window-size=1500,500', f'--screenshot={output}',
                (ROOT / f'concept-{concept}.html').as_uri()]
        with log.open('w') as stream:
            process = subprocess.Popen(args, stdout=stream, stderr=stream,
                                       start_new_session=True, cwd=ROOT)
            try:
                deadline = time.monotonic() + 50
                while time.monotonic() < deadline:
                    if output.exists() and 'bytes written to file' in log.read_text():
                        break
                    if process.poll() is not None:
                        raise RuntimeError(f'Chrome exited before rendering: {log.read_text()}')
                    time.sleep(.2)
                else:
                    raise TimeoutError(f'Chrome did not finish: {log.read_text()}')
            finally:
                # Some macOS Chrome builds keep their app loop alive after capture.
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                # Reap any helpers still in our isolated process group before
                # removing their profile, preventing late cache writes.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        header = output.read_bytes()[:24]
        assert header[:8] == b'\x89PNG\r\n\x1a\n', f'Invalid PNG: {output}'
        assert struct.unpack('>II', header[16:24]) == (3000, 1000), 'Wrong dimensions'
        assert output.stat().st_size < 2_000_000, 'PNG exceeds the 2 MB limit'
        print(f'{output.name}: 3000 x 1000; {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    choices = sys.argv[1:] or ['a', 'b']
    if any(choice not in ('a', 'b') for choice in choices):
        raise SystemExit('Usage: python3 render.py [a] [b]')
    for choice in choices:
        render(choice)

"""Screenshot a local HTML file with headless Chrome (macOS).

Chrome on macOS can keep its app loop alive after capturing, especially when a
regular Chrome window is open, so wait for the "bytes written" log line and then
kill the isolated process group instead of waiting for Chrome to exit.
"""
import os, signal, subprocess, tempfile, time
from pathlib import Path

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def screenshot(html_path, out_path, width, height, scale=1, timeout=50):
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix='chrome-shot-') as tmp:
        log = Path(tmp) / 'chrome.log'
        args = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
                '--no-default-browser-check', '--disable-background-networking',
                '--disable-component-update', f'--user-data-dir={tmp}/profile',
                f'--force-device-scale-factor={scale}', f'--window-size={width},{height}',
                f'--screenshot={out}', Path(html_path).resolve().as_uri()]
        with log.open('w') as stream:
            proc = subprocess.Popen(args, stdout=stream, stderr=stream, start_new_session=True)
            try:
                deadline = time.monotonic() + timeout
                while not (out.exists() and 'bytes written to file' in log.read_text()):
                    if proc.poll() is not None:
                        raise RuntimeError(f'Chrome exited before rendering:\n{log.read_text()}')
                    if time.monotonic() > deadline:
                        raise TimeoutError(f'Chrome did not finish:\n{log.read_text()}')
                    time.sleep(.2)
            finally:
                for sig in (signal.SIGTERM, signal.SIGKILL):
                    try:
                        os.killpg(proc.pid, sig)
                    except ProcessLookupError:
                        break
                    try:
                        proc.wait(timeout=5)
                        break
                    except subprocess.TimeoutExpired:
                        continue
    return out

import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8903
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        for W in [1440, 1280, 768]:
            pg = b.new_page(viewport={"width": W, "height": 900})
            pg.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(1500)
            info = pg.evaluate("""() => {
                const de = document.documentElement;
                const over = [];
                document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.right > window.innerWidth + 1 || r.left < -1) {
                        over.push({tag: el.tagName, cls: el.className, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width)});
                    }
                });
                return {
                    scrollW: de.scrollWidth, clientW: de.clientWidth, innerW: window.innerWidth,
                    over: over.slice(0, 12)
                };
            }""")
            print(f"\n=== viewport {W} ===")
            print(f"scrollWidth={info['scrollW']} clientWidth={info['clientW']} innerWidth={info['innerW']} -> horizontal overflow: {info['scrollW'] > info['clientW']}")
            for o in info["over"]:
                print(f"  OVERFLOW {o['tag']}.{str(o['cls'])[:40]:40} left={o['left']} right={o['right']} w={o['w']}")
            pg.close()
        b.close()
finally:
    srv.terminate()

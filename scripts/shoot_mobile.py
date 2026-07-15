import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8901
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
OUT = os.path.join(ROOT, "scripts", "shots"); os.makedirs(OUT, exist_ok=True)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(1500)
        pg.screenshot(path=os.path.join(OUT, "m_hero.png"))
        pg.eval_on_selector("#causal-map", "el=>el.scrollIntoView()"); pg.wait_for_timeout(1000)
        pg.screenshot(path=os.path.join(OUT, "m_causal.png"))
        pg.eval_on_selector("#results", "el=>el.scrollIntoView()"); pg.wait_for_timeout(1000)
        pg.screenshot(path=os.path.join(OUT, "m_results.png"))
        b.close()
    print("mobile shots done")
finally:
    srv.terminate()

import subprocess, time, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8899
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
OUT = os.path.join(ROOT, "scripts", "shots")
os.makedirs(OUT, exist_ok=True)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
        pg.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(2500)
        # scroll through to trigger reveals + lazy load
        for y in range(0, 8000, 700):
            pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(180)
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(800)
        pg.screenshot(path=os.path.join(OUT, "full.png"), full_page=True)
        # hero
        pg.screenshot(path=os.path.join(OUT, "hero.png"))
        # causal map section
        pg.eval_on_selector("#causal-map", "el=>el.scrollIntoView()"); pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(OUT, "causalmap.png"))
        # comparisons
        pg.eval_on_selector("#comparisons", "el=>el.scrollIntoView()"); pg.wait_for_timeout(1000)
        pg.screenshot(path=os.path.join(OUT, "comparisons.png"))
        # metrics
        pg.eval_on_selector("#quant", "el=>el.scrollIntoView()"); pg.wait_for_timeout(800)
        pg.screenshot(path=os.path.join(OUT, "metrics.png"))
        # console errors
        b.close()
    print("shots done")
finally:
    srv.terminate()

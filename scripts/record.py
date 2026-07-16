import subprocess, time, os, sys, glob
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8902
VOUT = os.path.join(ROOT, "scripts", "rec")
os.makedirs(VOUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": 1280, "height": 800},
                            record_video_dir=VOUT, record_video_size={"width": 1280, "height": 800})
        pg = ctx.new_page()
        pg.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(2000)

        # 1) hero dwell
        pg.wait_for_timeout(1500)
        # 2) slow scroll to causal map
        for y in range(0, 1500, 60):
            pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(45)
        pg.eval_on_selector("#causal-map", "el=>el.scrollIntoView({block:'start'})")
        pg.wait_for_timeout(1400)

        # 3) interact with causal map — hover several blocks to show video + readout swap
        for blk in ["0", "5", "9", "17", "23", "34", "18"]:
            sel = f'.cm-col[data-block="{blk}"]'
            try:
                pg.hover(sel, timeout=2000)
                pg.dispatch_event(sel, "mouseenter")
            except Exception:
                pass
            pg.wait_for_timeout(1100)
        pg.wait_for_timeout(600)

        # 4) toggle a legend filter (dim weak)
        try:
            pg.click('.cm-legend .lg[data-g="weak"]'); pg.wait_for_timeout(900)
            pg.click('.cm-legend .lg[data-g="weak"]'); pg.wait_for_timeout(500)
        except Exception:
            pass

        # 5) scroll through method + gallery
        for y in range(1500, 5200, 70):
            pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(40)
        pg.wait_for_timeout(1200)
        # 6) gallery filter click
        try:
            pg.eval_on_selector("#results", "el=>el.scrollIntoView({block:'start'})"); pg.wait_for_timeout(900)
            for cat in ["animal", "anime", "all"]:
                pg.click(f'.chip[data-cat="{cat}"]'); pg.wait_for_timeout(1100)
        except Exception:
            pass
        # 7) comparisons + metrics
        pg.eval_on_selector("#comparisons", "el=>el.scrollIntoView({block:'start'})"); pg.wait_for_timeout(1600)
        pg.eval_on_selector("#quant", "el=>el.scrollIntoView({block:'start'})"); pg.wait_for_timeout(1400)
        pg.wait_for_timeout(600)

        path = pg.video.path()
        ctx.close(); b.close()
    print("raw webm:", path)
    # convert to mp4
    webms = sorted(glob.glob(os.path.join(VOUT, "*.webm")), key=os.path.getmtime)
    src = webms[-1]
    mp4 = os.path.join(ROOT, "scripts", "walkthrough.mp4")
    FF = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", src,
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26",
                    "-movflags", "+faststart", mp4], check=False)
    print("mp4:", mp4, os.path.getsize(mp4) // 1000, "KB")
finally:
    srv.terminate()

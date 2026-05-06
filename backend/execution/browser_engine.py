from playwright.async_api import async_playwright, Browser, Page
import asyncio

_playwright = None
_browser: Browser | None = None
_page: Page | None = None
_lock = asyncio.Lock()


async def _ensure_browser() -> Page:
    global _playwright, _browser, _page
    async with _lock:
        if _browser is None or not _browser.is_connected():
            try:
                _playwright = await async_playwright().start()
                _browser = await _playwright.chromium.launch(
                    headless=False,
                    args=["--start-maximized", "--foreground"]
                )
            except Exception as e:
                err = str(e)
                if "Executable doesn't exist" in err or "playwright install" in err.lower():
                    raise RuntimeError(
                        "Chromium not installed. Run: `playwright install chromium` in your terminal, then restart the backend."
                    ) from e
                raise
            _page = await _browser.new_page()
            print("[Browser] Launched persistent browser session")
        if _page is None or _page.is_closed():
            _page = await _browser.new_page()
    return _page


async def close_browser():
    global _playwright, _browser, _page
    try:
        if _page and not _page.is_closed():
            await _page.close()
        if _browser:
            await _browser.close()
        if _playwright:
            await _playwright.stop()
    except Exception as e:
        print(f"[Browser] Error during close: {e}")
    finally:
        _playwright = None
        _browser = None
        _page = None
    print("[Browser] Browser closed")


async def run_browser_action(step: dict) -> dict:
    action = step.get("action", "").lower()
    params = step.get("params", {})
    print(f"[Browser] action={action} params={params}")

    try:
        page = await _ensure_browser()

        if action in ("open_url", "navigate"):
            url = params.get("url", "")
            if not url:
                return {"success": False, "error": "No URL provided"}
            if not url.startswith("http"):
                url = "https://" + url
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            return {"success": True, "stdout": f"Opened {url}"}

        elif action == "click":
            selector = params.get("selector", "")
            x = params.get("x")
            y = params.get("y")

            if not selector and x is None:
                return {"success": False, "error": "No selector or coordinates provided"}

            # Handle screen(x,y) format e.g. selector="screen(1228,1050)"
            if selector and selector.startswith("screen("):
                import re
                m = re.match(r"screen\((\d+),\s*(\d+)\)", selector)
                if m:
                    x, y = int(m.group(1)), int(m.group(2))
                    selector = ""

            if x is not None and y is not None:
                print(f"[Browser] Current URL: {page.url}")
                print(f"[Browser] Clicking at coordinates ({x}, {y})")
                await page.mouse.click(float(x), float(y))
                return {"success": True, "stdout": f"Clicked at ({x}, {y})"}
            else:
                await page.wait_for_selector(selector, timeout=8000)
                await page.click(selector)
                return {"success": True, "stdout": f"Clicked {selector}"}

        elif action == "type":
            selector = params.get("selector", "")
            text = params.get("text", "")
            if not selector:
                return {"success": False, "error": "No selector provided"}
            await page.wait_for_selector(selector, timeout=8000)
            await page.fill(selector, text)
            return {"success": True, "stdout": f"Typed into {selector}"}

        elif action == "wait":
            selector = params.get("selector", "")
            if selector:
                await page.wait_for_selector(selector, timeout=10000)
                return {"success": True, "stdout": f"Element ready: {selector}"}
            else:
                ms = int(params.get("ms", 1000))
                await page.wait_for_timeout(ms)
                return {"success": True, "stdout": f"Waited {ms}ms"}

        elif action == "screenshot":
            path = params.get("path", "/tmp/autorift_screenshot.png")
            await page.screenshot(path=path, full_page=True)
            return {"success": True, "stdout": f"Screenshot saved: {path}"}

        elif action == "keydown":
            key = params.get("key", "")
            if not key:
                return {"success": False, "error": "No key provided"}
            await page.keyboard.press(key)
            return {"success": True, "stdout": f"Pressed key: {key}"}

        else:
            return {"success": False, "error": f"Unknown action: '{action}'"}

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[Browser] Exception type: {type(e).__name__}")
        print(f"[Browser] Exception str: {str(e)}")
        print(f"[Browser] Traceback:\n{tb}")
        err_msg = str(e) or type(e).__name__ or "Unknown exception (no message)"
        return {"success": False, "stdout": "", "error": err_msg}
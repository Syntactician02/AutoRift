from playwright.sync_api import sync_playwright, Page, Browser
from utils.logger import get_logger
from typing import Optional

logger = get_logger(__name__)

_playwright = None
_browser: Optional[Browser] = None
_page: Optional[Page] = None


def _ensure_browser():
    """Lazily initialise Playwright browser."""
    global _playwright, _browser, _page
    if _browser is None:
        logger.info("Launching Playwright browser...")
        _playwright = sync_playwright().start()
        _browser = _playwright.chromium.launch(headless=False)
        _page = _browser.new_page()
        logger.info("Browser launched.")


def close_browser():
    """Cleanly close the browser and Playwright instance."""
    global _playwright, _browser, _page
    if _browser:
        _browser.close()
        _browser = None
        _page = None
    if _playwright:
        _playwright.stop()
        _playwright = None
    logger.info("Browser closed.")


def execute_browser_step(step: dict) -> dict:
    """
    Execute a single browser automation step.
    Supported actions: open, click, type, navigate, screenshot.
    """
    _ensure_browser()
    action = step.get("action", "")
    logger.info(f"Browser action: {action} | step: {step}")

    try:
        if action == "open":
            url = step.get("url", "")
            _page.goto(url, wait_until="domcontentloaded", timeout=30000)
            logger.info(f"Opened URL: {url}")
            return {"success": True, "output": f"Opened {url}"}

        elif action == "navigate":
            url = step.get("url", "")
            _page.goto(url, wait_until="domcontentloaded", timeout=30000)
            logger.info(f"Navigated to: {url}")
            return {"success": True, "output": f"Navigated to {url}"}

        elif action == "click":
            selector = step.get("selector", "")
            _page.click(selector, timeout=10000)
            logger.info(f"Clicked: {selector}")
            return {"success": True, "output": f"Clicked {selector}"}

        elif action == "type":
            selector = step.get("selector", "")
            text = step.get("text", "")
            _page.fill(selector, text)
            logger.info(f"Typed into {selector}: {text}")
            return {"success": True, "output": f"Typed into {selector}"}

        elif action == "screenshot":
            path = step.get("path", "screenshot.png")
            _page.screenshot(path=path)
            logger.info(f"Screenshot saved: {path}")
            return {"success": True, "output": f"Screenshot saved to {path}"}

        else:
            logger.warning(f"Unknown browser action: {action}")
            return {"success": False, "error": f"Unknown browser action: {action}"}

    except Exception as e:
        logger.error(f"Browser error: {e}")
        return {"success": False, "error": str(e)}
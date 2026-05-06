from playwright.async_api import async_playwright

async def run_browser_action(step: dict) -> dict:
    action = step.get("action")
    params = step.get("params", {})
    print(f"[Browser] Action: {action} | Params: {params}")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()

            if action == "open_url":
                await page.goto(params.get("url", ""))
            elif action == "click":
                await page.click(params.get("selector", ""))
            elif action == "type":
                await page.fill(params.get("selector", ""), params.get("text", ""))
            elif action == "navigate":
                await page.goto(params.get("url", ""))
            else:
                await browser.close()
                return {"success": False, "error": f"Unknown browser action: {action}"}

            await browser.close()
            return {"success": True, "stdout": f"Browser action '{action}' completed"}

    except Exception as e:
        return {"success": False, "stdout": "", "error": str(e)}
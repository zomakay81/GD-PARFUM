
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            page.wait_for_load_state('networkidle')
            # Click the "Storico Vendite" navigation item
            page.click('text=Storico Vendite')
            page.wait_for_timeout(2000) # Wait for component to render and log
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()

run()

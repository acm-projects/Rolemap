import os
import asyncio
from playwright.async_api import async_playwright

async def login_handshake(page):
    email = os.getenv("HANDSHAKE_EMAIL")
    password = os.getenv("HANDSHAKE_PASSWORD")
    if not email or not password:
        print("[Handshake] No credentials found in .env, skipping login.")
        return False
        
    try:
        await page.goto("https://app.joinhandshake.com/login", timeout=30000)
        # Assuming typical login flow for reference
        await page.fill("input[name='email']", email)
        await page.click("button:has-text('Next')")
        await page.wait_for_timeout(2000)
        await page.fill("input[name='password']", password)
        await page.click("button:has-text('Sign In')")
        await page.wait_for_navigation(timeout=15000)
        return True
    except Exception as e:
        print(f"[Handshake] Login failed: {e}")
        return False

async def scrape_jobs(keywords=["Software Engineer"], limit=5, use_llm=True):
    """
    Scrapes Handshake for given keywords and returns a list of job dicts.
    """
    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        logged_in = await login_handshake(page)
        if not logged_in:
            print("[Handshake] Cannot scrape without login.")
            await browser.close()
            return jobs
            
        for keyword in keywords:
            search_query = keyword.replace(" ", "%20")
            url = f"https://app.joinhandshake.com/stu/postings?page=1&per_page=25&sort_direction=desc&sort_column=default&query={search_query}"
            print(f"[Handshake] Scraping: {url}")
            
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(3000)
                
                # Fetch job cards based on generic class selectors (subject to change)
                job_cards = await page.query_selector_all("div[class*='style__job-card']")
                for card in job_cards[:limit]:
                    try:
                        title_el = await card.query_selector("a[class*='style__job-title']")
                        job_name = await title_el.inner_text() if title_el else "Unknown Job"
                        
                        company_el = await card.query_selector("div[class*='style__employer-name']")
                        company_name = await company_el.inner_text() if company_el else "Unknown Company"
                        
                        jobs.append({
                            "company_name": company_name.strip(),
                            "job_type": "Internship", # Often Handshake defaults to Internships/Early Career
                            "qualifications": [keyword], 
                            "job_name": job_name.strip(),
                            "description": "Requires deeper page navigation."
                        })
                    except Exception as e:
                        print(f"[Handshake] Error parsing card: {e}")
            except Exception as e:
                print(f"[Handshake] Error navigating/finding jobs: {e}")
        
        await browser.close()
    return jobs

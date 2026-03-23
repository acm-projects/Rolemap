import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from playwright.async_api import async_playwright
from llm_parser import extract_jobs_from_text, _extract_jobs_rule_based

async def scrape_jobs(keywords=["Software Engineer", "Data Scientist"], limit=5, use_llm=True):
    """
    Scrapes Indeed for given keywords and returns a list of job dicts.
    """
    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for keyword in keywords:
            search_query = keyword.replace(" ", "+")
            url = f"https://www.indeed.com/jobs?q={search_query}"
            print(f"[Indeed] Scraping: {url}")
            
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(2000) # Give it a moment to load or get blocked
                
                # Check for Cloudflare/blocking
                page_title = await page.title()
                if "hCaptcha" in page_title or "Cloudflare" in page_title:
                    print("[Indeed] Blocked by Captcha/Cloudflare!")
                    continue
                
                # Wait for the page to load dynamic content
                await page.wait_for_timeout(5000)
                
                # Grab all text on the page
                page_text = await page.evaluate("() => document.body.innerText")
                
                # Extract jobs via LLM or local fallback
                mode = "LLM" if use_llm else "local parser"
                print(f"[Indeed] Extracting jobs via {mode} from {len(page_text)} chars of text...")
                if use_llm:
                    extracted = extract_jobs_from_text(page_text, keyword)
                else:
                    extracted = _extract_jobs_rule_based(page_text, keyword, max_jobs=limit)
                
                if extracted:
                    print(f"[Indeed] Found {len(extracted)} jobs.")
                    jobs.extend(extracted[:limit])
                else:
                    print("[Indeed] No jobs extracted for this keyword.")

            except Exception as e:
                print(f"[Indeed] Error traversing jobs: {e}")
        
        await browser.close()
    return jobs

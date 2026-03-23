import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from playwright.async_api import async_playwright
from llm_parser import extract_jobs_from_text, _extract_jobs_rule_based

async def scrape_jobs(keywords=["Software Engineer"], limit=5, use_llm=True):
    """
    Scrapes Intern.list for given keywords and returns a list of job dicts.
    """
    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # NOTE: Intern.list might not have a URL structure like this exactly, 
        # this is a generic framework assuming typical query structure
        for keyword in keywords:
            search_query = keyword.replace(" ", "%20")
            url = f"https://intern.list/jobs?q={search_query}"
            print(f"[Intern.list] Scraping: {url}")
            
            try:
                # Catch connection errors safely if domain is incorrect or blocks
                await page.goto(url, timeout=20000)
                await page.wait_for_timeout(5000)
                
                # Grab all text on the page
                page_text = await page.evaluate("() => document.body.innerText")
                
                # Extract jobs via LLM or local fallback
                mode = "LLM" if use_llm else "local parser"
                print(f"[Intern.list] Extracting jobs via {mode} from {len(page_text)} chars of text...")
                if use_llm:
                    extracted = extract_jobs_from_text(page_text, keyword)
                else:
                    extracted = _extract_jobs_rule_based(page_text, keyword, max_jobs=limit)
                
                if extracted:
                    print(f"[Intern.list] Found {len(extracted)} jobs.")
                    jobs.extend(extracted[:limit])
                else:
                    print("[Intern.list] No jobs extracted for this keyword.")

            except Exception as e:
                print(f"[Intern.list] Error traversing jobs: {e}")
        
        await browser.close()
    return jobs

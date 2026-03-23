import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from playwright.async_api import async_playwright
from llm_parser import extract_jobs_from_text, _extract_jobs_rule_based


async def _safe_inner_text(locator):
    try:
        txt = await locator.first.inner_text(timeout=1500)
        return txt.strip()
    except Exception:
        return ""


async def _extract_linkedin_structured(page, context, keyword: str, limit: int):
    """
    Extract job title/company/description by opening each visible LinkedIn job card.
    This avoids LLM parsing and reads the detail panel directly.
    """
    jobs = []
    seen = set()
    detail_page = await context.new_page()

    # Public LinkedIn jobs pages usually render cards in this list.
    card_locator = page.locator("ul.jobs-search__results-list li")
    card_count = await card_locator.count()
    if card_count == 0:
        return []

    max_cards = min(card_count, max(limit * 3, limit))
    for idx in range(max_cards):
        if len(jobs) >= limit:
            break

        card = card_locator.nth(idx)
        title = await _safe_inner_text(card.locator("h3.base-search-card__title, h3"))
        company = await _safe_inner_text(card.locator("h4.base-search-card__subtitle, h4, a.hidden-nested-link"))

        # Fallback selectors if title/company are still empty.
        if not title:
            title = await _safe_inner_text(card.locator("a.base-card__full-link"))
        if not company:
            company = await _safe_inner_text(card.locator(".base-search-card__subtitle"))

        if not title:
            continue
        if not company:
            company = "Unknown Company"

        sig = (company.lower(), title.lower())
        if sig in seen:
            continue
        seen.add(sig)

        # Read job detail URL from card link.
        detail_url = ""
        try:
            link = card.locator("a.base-card__full-link")
            if await link.count() > 0:
                detail_url = (await link.first.get_attribute("href")) or ""
        except Exception:
            pass

        description = ""
        if detail_url:
            try:
                await detail_page.goto(detail_url, timeout=30000)
                await detail_page.wait_for_timeout(1200)
                for selector in [
                    "div.show-more-less-html__markup",
                    "div.description__text",
                    "div.jobs-description__content",
                    "section.show-more-less-html",
                    "main",
                ]:
                    description = await _safe_inner_text(detail_page.locator(selector))
                    if description and len(description) > 80:
                        break
                if description and len(description) > 8000:
                    description = description[:8000]
            except Exception:
                description = ""

        jobs.append({
            "company_name": company,
            "job_type": "Unknown",
            "qualifications": [keyword],
            "job_name": title,
            "description": description,
        })

    await detail_page.close()
    return jobs

async def scrape_jobs(keywords=["Software Engineer", "Data Scientist"], limit=5, use_llm=True):
    """
    Scrapes LinkedIn for given keywords and returns a list of job dicts.
    """
    jobs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for keyword in keywords:
            search_query = keyword.replace(" ", "%20")
            url = f"https://www.linkedin.com/jobs/search?keywords={search_query}"
            print(f"[LinkedIn] Scraping: {url}")
            
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(2000)
                
                # Wait for the page to load dynamic content
                await page.wait_for_timeout(5000)

                # Save a debug screenshot
                screenshot_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", f"debug_{keyword.replace(' ', '_')}.png")
                await page.screenshot(path=screenshot_path)
                print(f"[LinkedIn] Debug screenshot saved: {screenshot_path}")
                
                # Grab all text on the page
                page_text = await page.evaluate("() => document.body.innerText")
                
                # Extract jobs via LLM or structured local extraction
                mode = "LLM" if use_llm else "local parser"
                print(f"[LinkedIn] Extracting jobs via {mode} from {len(page_text)} chars of text...")
                print(f"[LinkedIn] Page text snippet: {page_text[:500].replace('\n', ' ')}")
                if use_llm:
                    extracted = extract_jobs_from_text(page_text, keyword)
                else:
                    extracted = await _extract_linkedin_structured(page, context, keyword, limit)
                    if not extracted:
                        extracted = _extract_jobs_rule_based(page_text, keyword, max_jobs=limit)
                
                if extracted:
                    print(f"[LinkedIn] Found {len(extracted)} jobs.")
                    jobs.extend(extracted[:limit])
                else:
                    print("[LinkedIn] No jobs extracted for this keyword.")

            except Exception as e:
                print(f"[LinkedIn] Error traversing jobs: {e}")
        
        await browser.close()
    return jobs

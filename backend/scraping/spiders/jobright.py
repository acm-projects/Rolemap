import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from urllib.parse import urljoin
from playwright.async_api import async_playwright
from llm_parser import extract_jobs_from_text, _extract_jobs_rule_based, _is_relevant_job


async def _safe_inner_text(locator):
    try:
        txt = await locator.first.inner_text(timeout=1500)
        return txt.strip()
    except Exception:
        return ""


async def _extract_jobright_structured(page, keyword: str, limit: int):
    """
    Best-effort structured extraction for Jobright without LLM.
    Reads card titles/companies and opens details when available.
    """
    jobs = []
    seen = set()

    # Pull candidate links directly from anchors to reduce selector brittleness.
    link_candidates = await page.evaluate("""
        () => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors
                .map(a => ({ href: a.getAttribute('href') || '', text: (a.innerText || '').trim() }))
                .filter(x => (x.href.includes('/job/') || x.href.includes('/jobs/')) && x.text.length >= 4 && x.text.length <= 140);
        }
    """)
    if not link_candidates:
        return []

    # Keep first unique links.
    unique_links = []
    seen_links = set()
    for item in link_candidates:
        href = item.get("href", "")
        if not href:
            continue
        full_href = urljoin("https://jobright.ai", href)
        if full_href in seen_links:
            continue
        seen_links.add(full_href)
        unique_links.append({"href": full_href, "text": item.get("text", "")})
        if len(unique_links) >= limit * 4:
            break

    detail_page = page

    for item in unique_links:
        if len(jobs) >= limit:
            break

        detail_url = item["href"]

        try:
            await detail_page.goto(detail_url, timeout=30000)
            await detail_page.wait_for_timeout(900)
        except Exception:
            continue

        title = await _safe_inner_text(detail_page.locator("h1, h2"))
        if not title:
            title = item.get("text", "")

        company = await _safe_inner_text(detail_page.locator("[class*='company'], a[href*='/company'], span"))

        if not title or len(title) > 140:
            continue

        if not company:
            company = "Unknown Company"

        sig = (company.lower(), title.lower())
        if sig in seen:
            continue
        seen.add(sig)

        description = ""
        for selector in [
            "div[class*='description']",
            "section[class*='description']",
            "article",
            "main",
        ]:
            description = await _safe_inner_text(detail_page.locator(selector))
            if description:
                break

        # If selectors were polluted by navigation text, recover title/company from detail block.
        if description:
            lines = [ln.strip() for ln in description.splitlines() if ln and ln.strip()]
            if company.upper() in {"SIGN IN", "JOIN NOW", "JOBS"} and "APPLY NOW" in lines:
                apply_idx = lines.index("APPLY NOW")
                if apply_idx + 2 < len(lines):
                    company = lines[apply_idx + 1]
                    possible_title = lines[apply_idx + 2]
                    if possible_title.startswith("·") and apply_idx + 3 < len(lines):
                        possible_title = lines[apply_idx + 3]
                    if possible_title:
                        title = possible_title

        is_relevant, _ = _is_relevant_job(title, keyword)
        if not is_relevant:
            continue

        jobs.append({
            "company_name": company,
            "job_type": "Unknown",
            "qualifications": [keyword],
            "job_name": title,
            "description": description[:8000] if description else "",
        })

    return jobs

async def scrape_jobs(keywords=["Software Engineer"], limit=5, use_llm=True):
    """
    Scrapes Jobright for given keywords and returns a list of job dicts.
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
            url = f"https://jobright.ai/jobs?query={search_query}"
            print(f"[Jobright] Scraping: {url}")
            
            try:
                await page.goto(url, timeout=30000)
                # Wait for the page to load dynamic content
                await page.wait_for_timeout(5000)
                
                # Grab all text on the page
                page_text = await page.evaluate("() => document.body.innerText")
                
                # Extract jobs via LLM or structured local extraction
                mode = "LLM" if use_llm else "local parser"
                print(f"[Jobright] Extracting jobs via {mode} from {len(page_text)} chars of text...")
                if use_llm:
                    extracted = extract_jobs_from_text(page_text, keyword)
                else:
                    extracted = await _extract_jobright_structured(page, keyword, limit)
                    if not extracted:
                        extracted = _extract_jobs_rule_based(page_text, keyword, max_jobs=limit)
                
                if extracted:
                    print(f"[Jobright] Found {len(extracted)} jobs.")
                    jobs.extend(extracted[:limit])
                else:
                    print("[Jobright] No jobs extracted for this keyword.")

            except Exception as e:
                print(f"[Jobright] Error traversing jobs: {e}")
        
        await browser.close()
    return jobs

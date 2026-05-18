import asyncio
import logging
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_MAX_CONCURRENT_SCRAPES = 3
_SCRAPE_TIMEOUT = 15.0


async def scrape_urls(urls: list[str]) -> dict[str, str]:
    sem = asyncio.Semaphore(_MAX_CONCURRENT_SCRAPES)

    async def scrape_one(url: str) -> tuple[str, Optional[str]]:
        async with sem:
            return url, await _scrape(url)

    tasks = [scrape_one(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output: dict[str, str] = {}
    for result in results:
        if isinstance(result, Exception):
            logger.warning(f"Scrape task failed: {result}")
            continue
        url, content = result
        if content:
            output[url] = content
    return output


async def _scrape(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(_SCRAPE_TIMEOUT)) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; VoiceSearchBot/1.0)",
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                follow_redirects=True,
            )
            if resp.status_code != 200:
                logger.warning(f"Non-200 response for {url}: {resp.status_code}")
                return None
            return _extract_text(resp.text, url)
    except httpx.TimeoutException:
        logger.warning(f"Timeout scraping {url}")
        return None
    except Exception as e:
        logger.warning(f"Error scraping {url}: {e}")
        return None


async def scrape_with_playwright(urls: list[str]) -> dict[str, str]:
    """Heavy-duty scraping with Playwright for JS-heavy pages."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.info("Playwright not installed, falling back to httpx scraping")
        return await scrape_urls(urls)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        results: dict[str, str] = {}
        sem = asyncio.Semaphore(2)

        async def scrape_one(url: str):
            async with sem:
                try:
                    page = await browser.new_page()
                    await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                    text = await page.evaluate("() => document.body.innerText")
                    await page.close()
                    if text:
                        results[url] = clean_text(text)
                except Exception as e:
                    logger.warning(f"Playwright error for {url}: {e}")

        tasks = [scrape_one(url) for url in urls]
        await asyncio.gather(*tasks, return_exceptions=True)
        await browser.close()
        return results


def _extract_text(html: str, url: str = "") -> Optional[str]:
    soup = BeautifulSoup(html, "lxml")
    _remove_junk(soup)
    text = soup.get_text(separator="\n", strip=True)
    return clean_text(text)


def _remove_junk(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()
    for tag in soup.find_all(class_=re.compile(r"nav|footer|sidebar|menu|ad|banner|cookie|popup", re.I)):
        tag.decompose()


def clean_text(text: str) -> Optional[str]:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()
    if len(text) < 50:
        return None
    return text


def chunk_text(text: str, max_chars: int = 3000) -> list[str]:
    """Split text into overlapping chunks of roughly max_chars."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) < max_chars:
            current += para + "\n\n"
        else:
            if current.strip():
                chunks.append(current.strip())
            current = para + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    if not chunks:
        chunks = [text[:max_chars]]

    return chunks

"""GitHub REST API wrapper."""
from __future__ import annotations
import time
import requests


_BASE = "https://api.github.com"


class GitHubClient:
    def __init__(self, token: str | None = None):
        self._token = token

    def _headers(self) -> dict:
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _get(self, path: str, params: dict | None = None) -> dict | list:
        url = f"{_BASE}{path}"
        for attempt in range(2):
            resp = requests.get(url, headers=self._headers(), params=params, timeout=30)
            if resp.status_code == 403 and attempt == 0:
                print("[warn] GitHub rate limit hit — sleeping 60s...")
                time.sleep(60)
                continue
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()

    def _get_paginated(self, path: str, params: dict | None = None, max_pages: int = 3) -> list:
        params = dict(params or {})
        params.setdefault("per_page", 100)
        results = []
        for page in range(1, max_pages + 1):
            params["page"] = page
            page_data = self._get(path, params)
            if not isinstance(page_data, list):
                break
            results.extend(page_data)
            if len(page_data) < params["per_page"]:
                break
        return results

    def get_user(self, username: str) -> dict:
        return self._get(f"/users/{username}")

    def get_repos(self, username: str) -> list:
        return self._get_paginated(
            f"/users/{username}/repos",
            params={"sort": "pushed", "per_page": 100},
        )

    def get_repo_languages(self, owner: str, repo: str) -> dict:
        return self._get(f"/repos/{owner}/{repo}/languages")

    def get_public_events(self, username: str) -> list:
        return self._get_paginated(f"/users/{username}/events/public")

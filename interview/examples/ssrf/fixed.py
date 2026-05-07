from urllib.parse import urlparse
import requests

ALLOWED_HOSTS = {"api.example.com", "cdn.example.com"}


def fetch_remote(url: str):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("blocked destination")
    return requests.get(url, timeout=3).text


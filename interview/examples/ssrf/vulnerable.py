import requests


def fetch_remote(url: str):
    # Vulnerable: no allow-list / scheme restrictions.
    return requests.get(url, timeout=3).text


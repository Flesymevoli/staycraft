"""Server-only authentication for compatible model providers."""
import os


def model_headers(key: str) -> dict[str, str]:
    headers = {"Authorization": "Bearer " + key}
    if os.getenv("MODEL_AUTH_MODE") == "api-key":
        headers["api-key"] = key
    return headers

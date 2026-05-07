def allow_upload(filename: str, content_type: str) -> bool:
    # Vulnerable: trusts extension and client-provided MIME type.
    return filename.endswith(".jpg") and content_type == "image/jpeg"


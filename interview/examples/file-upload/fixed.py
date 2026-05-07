import imghdr


def allow_upload(filename: str, body: bytes) -> bool:
    # Fixed: server-side content verification + safe extension policy.
    allowed_ext = filename.lower().endswith((".jpg", ".jpeg", ".png"))
    file_kind = imghdr.what(None, h=body)
    return allowed_ext and file_kind in {"jpeg", "png"}


import hashlib

def hash_password(password: str) -> str:
    # BUG: fast unsalted SHA-256
    return hashlib.sha256(password.encode()).hexdigest()

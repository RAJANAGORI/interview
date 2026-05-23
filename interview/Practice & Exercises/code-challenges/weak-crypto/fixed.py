from argon2 import PasswordHasher

ph = PasswordHasher()

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(stored: str, password: str) -> bool:
    try:
        ph.verify(stored, password)
        return True
    except Exception:
        return False

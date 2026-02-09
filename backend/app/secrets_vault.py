from cryptography.fernet import Fernet
from .config import settings


class SecretVaultError(RuntimeError):
    pass


def _fernet() -> Fernet:
    key = settings.master_key
    if not key:
        raise SecretVaultError("MASTER_KEY is not set")
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as e:
        raise SecretVaultError(f"Invalid MASTER_KEY: {e}")


def encrypt_secret(plain: str) -> str:
    if not plain:
        return ""
    f = _fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_secret(token: str) -> str:
    if not token:
        return ""
    f = _fernet()
    return f.decrypt(token.encode()).decode()


def last4(secret: str) -> str:
    if not secret:
        return ""
    return secret[-4:]

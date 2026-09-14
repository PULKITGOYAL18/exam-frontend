import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_token(user_id: str, role: str) -> str:
    """
    Create JWT token with proper claims including 'sub'
    Flask-JWT-Extended requires the 'sub' claim for identity
    """
    secret = os.getenv("JWT_SECRET")

    if not secret:
        raise RuntimeError("JWT_SECRET is not configured")

    payload = {
        "sub": str(user_id),           # ← KEY FIX: Flask-JWT-Extended looks for 'sub'
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8)
    }

    return jwt.encode(
        payload,
        secret,
        algorithm="HS256"
    )
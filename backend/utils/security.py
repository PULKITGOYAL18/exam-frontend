import os
from functools import wraps
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import request, jsonify


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    """

    if not password:
        raise ValueError("Password cannot be empty")

    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


# ============================================================
# PASSWORD VERIFICATION
# ============================================================

def verify_password(
    password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain-text password against
    a bcrypt hashed password.
    """

    if not password or not hashed_password:
        return False

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )

    except Exception:
        return False


# ============================================================
# JWT TOKEN CREATION
# ============================================================

def create_token(
    user_id: str,
    role: str
) -> str:
    """
    Create JWT token.

    Token contains:

        sub     -> MongoDB user ID
        user_id -> MongoDB user ID
        role    -> user role
        exp     -> expiration time
    """

    secret = os.getenv("JWT_SECRET")

    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not configured"
        )

    user_id = str(user_id)

    role = str(
        role or "user"
    ).strip().lower()

    now = datetime.now(
        timezone.utc
    )

    payload = {

        "sub": user_id,

        "user_id": user_id,

        "role": role,

        "iat": now,

        "exp": (
            now +
            timedelta(hours=8)
        )
    }

    return jwt.encode(
        payload,
        secret,
        algorithm="HS256"
    )


# ============================================================
# JWT TOKEN DECODING
# ============================================================

def decode_token(token: str):
    """
    Decode and validate a JWT token.

    Returns:
        decoded payload

    Raises:
        Exception if token is invalid or expired.
    """

    secret = os.getenv("JWT_SECRET")

    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not configured"
        )

    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"]
    )


# ============================================================
# GET TOKEN FROM REQUEST
# ============================================================

def get_token_from_request():
    """
    Extract JWT token from:

        Authorization: Bearer <token>
    """

    authorization = request.headers.get(
        "Authorization",
        ""
    ).strip()

    if not authorization:
        return None

    parts = authorization.split(
        " ",
        1
    )

    if len(parts) != 2:
        return None

    scheme, token = parts

    if scheme.lower() != "bearer":
        return None

    token = token.strip()

    if not token:
        return None

    return token


# ============================================================
# AUTHENTICATION DECORATOR
# ============================================================

def token_required(function):
    """
    Require a valid JWT token.

    The decoded user information is attached to:

        request.current_user
    """

    @wraps(function)
    def decorated(*args, **kwargs):

        token = get_token_from_request()

        if not token:

            return jsonify({
                "success": False,
                "message":
                    "Authorization token is required"
            }), 401

        try:

            decoded = decode_token(
                token
            )

            # ------------------------------------------------
            # Normalize user information
            # ------------------------------------------------

            user_id = (
                decoded.get("sub")
                or decoded.get("user_id")
            )

            role = decoded.get(
                "role"
            )

            if not user_id:

                return jsonify({
                    "success": False,
                    "message":
                        "Invalid token: user ID missing"
                }), 401

            if role:

                role = str(
                    role
                ).strip().lower()

            # ------------------------------------------------
            # Store current user
            # ------------------------------------------------

            request.current_user = {

                "id": str(
                    user_id
                ),

                "user_id": str(
                    user_id
                ),

                "role": role

            }

            return function(
                *args,
                **kwargs
            )

        except jwt.ExpiredSignatureError:

            return jsonify({
                "success": False,
                "message":
                    "Token has expired"
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "success": False,
                "message":
                    "Invalid authentication token"
            }), 401

        except Exception as e:

            print(
                "Authentication error:",
                str(e)
            )

            return jsonify({
                "success": False,
                "message":
                    "Authentication failed"
            }), 401

    return decorated


# ============================================================
# ROLE AUTHORIZATION
# ============================================================

def roles_required(*allowed_roles):
    """
    Require authentication and one of the specified roles.

    Example:

        @roles_required(
            "admin",
            "faculty",
            "hod",
            "dean"
        )

    The role is taken from the verified JWT token.

    It is NOT trusted from the frontend request body.
    """

    normalized_roles = {

        str(role)
        .strip()
        .lower()

        for role in allowed_roles

        if role is not None
    }

    def decorator(function):

        @wraps(function)
        def decorated(*args, **kwargs):

            # ------------------------------------------------
            # Get token
            # ------------------------------------------------

            token = get_token_from_request()

            if not token:

                return jsonify({
                    "success": False,
                    "message":
                        "Authorization token is required"
                }), 401

            # ------------------------------------------------
            # Decode token
            # ------------------------------------------------

            try:

                decoded = decode_token(
                    token
                )

            except jwt.ExpiredSignatureError:

                return jsonify({
                    "success": False,
                    "message":
                        "Token has expired"
                }), 401

            except jwt.InvalidTokenError:

                return jsonify({
                    "success": False,
                    "message":
                        "Invalid authentication token"
                }), 401

            except Exception as e:

                print(
                    "JWT validation error:",
                    str(e)
                )

                return jsonify({
                    "success": False,
                    "message":
                        "Authentication failed"
                }), 401

            # ------------------------------------------------
            # Get identity
            # ------------------------------------------------

            user_id = (
                decoded.get("sub")
                or decoded.get("user_id")
            )

            role = decoded.get(
                "role"
            )

            if not user_id:

                return jsonify({
                    "success": False,
                    "message":
                        "Invalid token: user ID missing"
                }), 401

            # ------------------------------------------------
            # Normalize role
            # ------------------------------------------------

            if role is not None:

                role = str(
                    role
                ).strip().lower()

            # ------------------------------------------------
            # Store authenticated user
            # ------------------------------------------------

            request.current_user = {

                "id": str(
                    user_id
                ),

                "user_id": str(
                    user_id
                ),

                "role": role

            }

            # ------------------------------------------------
            # Check role
            # ------------------------------------------------

            if role not in normalized_roles:

                return jsonify({

                    "success": False,

                    "message":
                        "You are not authorized "
                        "to perform this action",

                    "required_roles":
                        list(
                            normalized_roles
                        ),

                    "your_role":
                        role

                }), 403

            # ------------------------------------------------
            # Authorized
            # ------------------------------------------------

            return function(
                *args,
                **kwargs
            )

        return decorated

    return decorator


# ============================================================
# CURRENT USER HELPER
# ============================================================

def get_current_user():
    """
    Return the authenticated user attached
    to the current request.

    Returns None when authentication
    information is unavailable.
    """

    return getattr(
        request,
        "current_user",
        None
    )
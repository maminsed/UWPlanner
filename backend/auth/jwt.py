import os
from dotenv import load_dotenv
from datetime import timezone, datetime, timedelta
from typing import Literal
import jwt
load_dotenv()


def encode(expiresIn:float, username:str, type:Literal['ACCESS', 'REFRESH'])->str:
    """
    Generate (encode and sign) a JWT.

    Args:
        expires_in: Lifetime of the token in **seconds** before it expires.
        username: The user identifier to embed as the token’s subject (“sub” claim).
        token_type: Kind of token being generated — either `"ACCESS"` or `"REFRESH"`.

    Returns:
        The compact JWT string.
    """
    key = os.getenv(f'{type.upper()}_TOKEN_SECRET')
    return jwt.encode({
        "username": username,
        'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=expiresIn)
    }, key, algorithm='HS256')

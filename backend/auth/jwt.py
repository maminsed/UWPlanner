import os
from dotenv import load_dotenv
from datetime import timezone, datetime, timedelta
from typing import Literal
from flask import make_response, jsonify, request, g
from jwt.exceptions import ExpiredSignatureError
import jwt
load_dotenv()


def encode(username:str, type:Literal['ACCESS', 'REFRESH'])->str:
    """
    Generate (encode and sign) a JWT.

    Args:
        username: The user identifier to embed as the token’s subject (“sub” claim).
        token_type: Kind of token being generated — either `"ACCESS"` or `"REFRESH"`.

    Returns:
        The compact JWT string.
    """
    key = os.getenv(f'{type.upper()}_TOKEN_SECRET')
    if type.upper() == 'ACCESS': 
        expiresIn = 30
    else:
        expiresIn = 24*60*60
    return jwt.encode({
        "username": username,
        'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=expiresIn)
    }, key, algorithm='HS256')


def verify():
    req = request.headers.get('Authorization')
    if not req:
        return jsonify({"message": 'missing required field: authorization'}), 401
    authHeader = req.split(' ')[1]
    try:
        res = jwt.decode(authHeader, os.getenv('ACCESS_TOKEN_SECRET'), algorithms='HS256', options={'require':['exp', 'username'], 'verify_exp':'verify_signature'})
        g.username = res.username
        return None
    except ExpiredSignatureError:
        return make_response(jsonify({'message': 'access token has timed out'}), 403)
    except Exception as e:
        return make_response(jsonify({'message': 'authHeader was tampered with', 'error': str(e)}), 403)
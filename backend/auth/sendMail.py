import random

from ..google_api.gmail_api import gmail_send_message
from ..Schema import Users


def send_verification_mail(user:Users)->None:
    """Sends a verification email to user and saves the code in database.

    Requires:
        user (Users):
            The user which is being sent to.
    
    """
    code=random.randint(100000, 999999)
    body=f"""
Hi,

Your verification code is: [{code}]
This verification code will expire in 30 minutes.

This e-mail was sent from a notification-only address that cannot accept incoming e-mails. Please do not reply to this message. 
    """
    gmail_send_message(to=user.email, body=body, subject="Verification Code For UWPlanner")

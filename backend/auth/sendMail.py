import random

from ..google_api.gmail_api import gmail_send_message
from ..Schema import Users, db
from datetime import datetime, timedelta, timezone

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
    try:
        user.verification_code = code
        time = datetime.now(timezone.utc) + timedelta(minutes=30)
        user.verification_expiration = time
        db.session.add(user)
        db.session.commit()
    except Exception as e:
        print("ERROR OCCURED NO VERIFICATION CODE SENT")
        print(e)

    gmail_send_message(to=user.email, body=body, subject="Verification Code For UWPlanner")

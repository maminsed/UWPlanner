import secrets
from datetime import datetime, timedelta, timezone

from ..Google_api.gmail_api import gmail_send_message
from ..Schema import Users, db

APP_NAME = "UWPlanner"


def send_verification_mail(
    user: Users, verification_expiration_minutes: int = 30
) -> None:
    """Sends a verification email to the user and saves the code in the database."""
    now = datetime.now(timezone.utc)

    if user.verification_code and user.verification_expiration:
        if user.verification_expiration > now + timedelta(
            minutes=verification_expiration_minutes, seconds=-30
        ):
            return

    code = secrets.randbelow(900_000) + 100_000
    expiration_time = now + timedelta(minutes=verification_expiration_minutes)

    try:
        user.verification_code = code
        user.verification_expiration = expiration_time

        db.session.add(user)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        print("ERROR OCCURRED: VERIFICATION CODE WAS NOT SAVED")
        print(e)
        return

    body = f"""Hi there,

Welcome to {APP_NAME}!

To verify your email address, enter this code in the website:

{code}

This code will expire in {verification_expiration_minutes} minutes.

If you did not request this code, you can safely ignore this email. No changes will be made to your account.

Thanks,
The {APP_NAME} Team

---
This is an automated message from {APP_NAME}. Please do not reply to this email.
"""

    try:
        gmail_send_message(
            to=user.email,
            body=body,
            subject=f"Your {APP_NAME} verification code",
        )
    except Exception as e:
        print("ERROR OCCURRED WHILE SENDING VERIFICATION EMAIL")
        print(e)


def send_delete_account_mail(email: str) -> None:
    """Sends an email confirming the account deletion."""
    body = f"""Hi there,

Your {APP_NAME} account has been deleted successfully.

You no longer have access to this account, and your account-related data has been removed according to our account deletion process.

If you requested this deletion, no further action is needed.

If you did not request this, please contact the {APP_NAME} team as soon as possible.

Thanks,
The {APP_NAME} Team

---
This is an automated message from {APP_NAME}. Please do not reply to this email.
"""

    try:
        gmail_send_message(
            to=email,
            body=body,
            subject=f"Your {APP_NAME} account has been deleted",
        )
    except Exception as e:
        print("ERROR OCCURRED WHILE SENDING ACCOUNT DELETION EMAIL")
        print(e)

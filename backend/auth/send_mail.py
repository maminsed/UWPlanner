import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..Schema import Users, db

APP_NAME = "UWPlanner"


def send_SMTP_mail(to: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_SERVER") or ""
    smtp_port = int(os.getenv("SMTP_PORT") or "587")
    login = os.getenv("SMTP_LOGIN")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("VERIFICATION_EMAIL")

    if not login or not password:
        raise Exception("Brevo SMTP credentials are not set.")

    msg = MIMEMultipart()
    msg["From"] = from_addr
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(login, password)
            server.sendmail(from_addr, to, msg.as_string())
    except Exception as e:
        print(f"[email] Delivery failed to {to}: {e}")
        raise Exception(f"Failed to send email to {to}") from e


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
        send_SMTP_mail(user.email, f"Your {APP_NAME} verification code", body)
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
        send_SMTP_mail(email, f"Your {APP_NAME} account has been deleted", body)
    except Exception as e:
        print("ERROR OCCURRED WHILE SENDING ACCOUNT DELETION EMAIL")
        print(e)

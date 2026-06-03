import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..app_logger import logger
from ..Schema import Users, db

APP_NAME = "UWPlanner"


class EmailDeliveryError(RuntimeError):
    """Raised when a verification email cannot be delivered."""


def send_smtp_mail(to: str, subject: str, body: str) -> None:
    """Send a plain-text email with the configured Brevo SMTP credentials."""
    smtp_host = os.getenv("SMTP_SERVER") or ""
    smtp_port = int(os.getenv("SMTP_PORT") or "587")
    login = os.getenv("SMTP_LOGIN")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("VERIFICATION_EMAIL")

    if not smtp_host or not login or not password or not from_addr:
        raise EmailDeliveryError("Brevo SMTP credentials are not set.")

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
        logger.exception("Email delivery failed")
        raise EmailDeliveryError("Failed to send email") from e


def send_verification_mail(
    user: Users, verification_expiration_minutes: int = 30
) -> bool:
    """Sends a verification email to the user and saves the code in the database."""
    now = datetime.now(timezone.utc)

    if user.verification_code and user.verification_expiration:
        if user.verification_expiration > now + timedelta(
            minutes=verification_expiration_minutes, seconds=-30
        ):
            return False

    code = secrets.randbelow(900_000) + 100_000
    expiration_time = now + timedelta(minutes=verification_expiration_minutes)

    try:
        user.verification_code = code
        user.verification_expiration = expiration_time

        db.session.add(user)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logger.exception("Verification code could not be saved")
        raise EmailDeliveryError("Failed to save verification code") from e

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

    send_smtp_mail(user.email, f"Your {APP_NAME} verification code", body)
    return True


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
        send_smtp_mail(email, f"Your {APP_NAME} account has been deleted", body)
    except Exception:
        logger.exception("Failed to send account deletion email")

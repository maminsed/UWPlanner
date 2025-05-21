import smtplib
import ssl
import os
from dotenv import load_dotenv
load_dotenv()

port = 465
password = os.getenv('MAIL_PASSWORD')
print(password)

def send_email():
    context = ssl.create_default_context()
    message = """\
    Subject: Hi there


    This message is sent from Python. TOUCH MEEE."""

    with smtplib.SMTP_SSL("smtp.gmail.com", port, context=context) as server:
        server.login("noreply.uwplanner@gmail.com", password)
        #SEND EMAIL
        server.sendmail("noreply.uwplanner@gmail.com", "m.aminsedaghat84@gmail.com", message)
    print("Hello")

if __name__ == "__main__":
    send_email()


from app.services.email_service import send_email


send_email(
    to_email="harshitguptaa@gmail.com",
    subject="NIVARAN-AI Email Test",
    body=(
        "This is a test email from the NIVARAN-AI "
        "grievance redressal system."
    ),
)

print("Email sent successfully!")
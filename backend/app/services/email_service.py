import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("nivaran.email")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"


def render_email_template(template_name: str, context: dict) -> str:
    """
    Render an HTML email template with provided context dictionary.
    """
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        logger.error(f"Email template not found: {template_path}")
        raise FileNotFoundError(f"Template {template_name} not found.")

    content = template_path.read_text(encoding="utf-8")
    for key, value in context.items():
        placeholder = f"{{{{ {key} }}}}"
        content = content.replace(placeholder, str(value) if value is not None else "")

    return content


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Send an email via SMTP.
    Safely catches and logs errors, never raising an exception to the caller.
    Returns True if sent successfully, False otherwise.
    """
    if not to_email or "@" not in to_email:
        logger.warning(f"[EMAIL_FAILED] Invalid recipient email address: '{to_email}'")
        return False

    try:
        message = EmailMessage()
        from_header = settings.SMTP_FROM or f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["From"] = from_header
        message["To"] = to_email
        message["Subject"] = subject

        # Plain text fallback
        plain_text = text_content or html_content
        message.set_content(plain_text)

        # HTML payload
        if html_content and html_content != plain_text:
            message.add_alternative(html_content, subtype="html")

        print(
           f"[EMAIL] Connecting to "
           f"{settings.SMTP_HOST}:{settings.SMTP_PORT}"
             )

        timeout_seconds = 10
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=timeout_seconds,
        ) as server:
            print("[EMAIL] SMTP connection established")
            server.starttls()
            print("[EMAIL] STARTTLS successful")
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(
                    settings.SMTP_USERNAME,
                    settings.SMTP_PASSWORD,
                )
                print("[EMAIL] SMTP login successful")
            server.send_message(message)

        logger.info(f"[EMAIL_SENT] Email sent successfully to {to_email} | Subject: '{subject}'")
        return True

    except Exception as err:
        logger.error(f"[EMAIL_FAILED] Failed to send email to {to_email} | Subject: '{subject}' | Error: {type(err).__name__}: {err}")
        return False


def send_document_request_email(
    applicant_email: str,
    applicant_name: str,
    grievance_id: str,
    grievance_title: str,
    requested_document: str,
    instructions: str,
    deadline: Optional[str] = None,
) -> bool:
    """
    Send an email notification to applicant when additional documents are requested.
    """
    try:
        action_url = f"{settings.FRONTEND_URL}/dashboard/grievances/{grievance_id}"
        
        deadline_section = ""
        if deadline:
            deadline_section = f"""
            <div class="detail-row">
              <div class="detail-label">Submission Deadline</div>
              <div class="detail-value" style="color: #b91c1c;">{deadline}</div>
            </div>
            """

        context = {
            "applicant_name": applicant_name or "Applicant",
            "grievance_id": grievance_id,
            "grievance_title": grievance_title or "Untitled Grievance",
            "requested_document": requested_document or "Supporting Documentation",
            "instructions": instructions or "Please provide the requested supporting documentation.",
            "deadline_section": deadline_section,
            "action_url": action_url,
        }

        html_content = render_email_template("document_request.html", context)
        subject = f"Action Required: Document Requested for Your Grievance - {grievance_id}"

        success = send_email(
            to_email=applicant_email,
            subject=subject,
            html_content=html_content,
        )

        if success:
            logger.info(f"[DOCUMENT_REQUEST_EMAIL_SENT] Document request email dispatched for grievance {grievance_id} to {applicant_email}")
        else:
            logger.warning(f"[DOCUMENT_REQUEST_EMAIL_FAILED] Document request email could not be delivered for grievance {grievance_id} to {applicant_email}")

        return success

    except Exception as err:
        logger.error(f"[DOCUMENT_REQUEST_EMAIL_FAILED] Error preparing document request email for {grievance_id}: {err}")
        return False


def send_grievance_resolved_email(
    applicant_email: str,
    applicant_name: str,
    grievance_id: str,
    grievance_title: str,
    resolution_notes: str,
) -> bool:
    """
    Send an email notification to applicant when grievance is resolved.
    """
    try:
        action_url = f"{settings.FRONTEND_URL}/dashboard/grievances/{grievance_id}"

        context = {
            "applicant_name": applicant_name or "Applicant",
            "grievance_id": grievance_id,
            "grievance_title": grievance_title or "Untitled Grievance",
            "resolution_notes": resolution_notes or "The grievance has been resolved by university authority.",
            "action_url": action_url,
        }

        html_content = render_email_template("grievance_resolved.html", context)
        subject = f"Your Grievance Has Been Resolved – {grievance_id}"

        success = send_email(
            to_email=applicant_email,
            subject=subject,
            html_content=html_content,
        )

        if success:
            logger.info(f"[GRIEVANCE_RESOLVED_EMAIL_SENT] Resolution email dispatched for grievance {grievance_id} to {applicant_email}")
        else:
            logger.warning(f"[GRIEVANCE_RESOLVED_EMAIL_FAILED] Resolution email could not be delivered for grievance {grievance_id} to {applicant_email}")

        return success

    except Exception as err:
        logger.error(f"[GRIEVANCE_RESOLVED_EMAIL_FAILED] Error preparing resolution email for {grievance_id}: {err}")
        return False


def send_grievance_closed_email(
    applicant_email: str,
    applicant_name: str,
    grievance_id: str,
    grievance_title: str,
    closure_remarks: Optional[str] = None,
) -> bool:
    """
    Send an email notification to applicant when grievance is closed.
    """
    try:
        action_url = f"{settings.FRONTEND_URL}/dashboard/grievances/{grievance_id}"

        closure_remarks_section = ""
        if closure_remarks:
            closure_remarks_section = f"""
            <div class="detail-row">
              <div class="detail-label">Closure Remarks</div>
              <div class="detail-value">{closure_remarks}</div>
            </div>
            """

        context = {
            "applicant_name": applicant_name or "Applicant",
            "grievance_id": grievance_id,
            "grievance_title": grievance_title or "Untitled Grievance",
            "closure_remarks_section": closure_remarks_section,
            "action_url": action_url,
        }

        html_content = render_email_template("grievance_closed.html", context)
        subject = f"Your Grievance Has Been Closed – {grievance_id}"

        success = send_email(
            to_email=applicant_email,
            subject=subject,
            html_content=html_content,
        )

        if success:
            logger.info(f"[GRIEVANCE_CLOSED_EMAIL_SENT] Closure email dispatched for grievance {grievance_id} to {applicant_email}")
        else:
            logger.warning(f"[GRIEVANCE_CLOSED_EMAIL_FAILED] Closure email could not be delivered for grievance {grievance_id} to {applicant_email}")

        return success

    except Exception as err:
        logger.error(f"[GRIEVANCE_CLOSED_EMAIL_FAILED] Error preparing closure email for {grievance_id}: {err}")
        return False

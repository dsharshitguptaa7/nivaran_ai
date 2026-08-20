from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department: str | None = None
    phd_registration_number: str | None = None

    # Applicant's research/academic subject
    subject_id: UUID


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: str
    department: str | None
    phd_registration_number: str | None = None
    subject_id: UUID | None = None
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
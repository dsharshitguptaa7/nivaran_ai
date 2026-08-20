from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.user import User, UserRole
from app.models.subject import Subject

from app.schemas.auth import (
    UserRegister,
    UserResponse,
    TokenResponse,
)

from app.core.security import (
    hash_password,
    create_access_token,
    verify_password,
)

from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # 1. Check whether email already exists
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # --------------------------------------------------------
    # 2. Check PhD registration number uniqueness (if provided)
    # --------------------------------------------------------

    clean_phd_reg = user_data.phd_registration_number.strip() if user_data.phd_registration_number and user_data.phd_registration_number.strip() else None

    if clean_phd_reg:
        existing_reg = (
            db.query(User)
            .filter(User.phd_registration_number == clean_phd_reg)
            .first()
        )
        if existing_reg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="PhD Registration Number is already registered with another account.",
            )

    # --------------------------------------------------------
    # 3. Validate subject
    # --------------------------------------------------------

    subject = (
        db.query(Subject)
        .filter(
            Subject.id == user_data.subject_id,
            Subject.is_active.is_(True),
        )
        .first()
    )

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or inactive subject",
        )

    # --------------------------------------------------------
    # 4. Create new Applicant
    # --------------------------------------------------------

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=UserRole.APPLICANT,
        department=user_data.department,
        phd_registration_number=clean_phd_reg,
        subject_id=subject.id,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user
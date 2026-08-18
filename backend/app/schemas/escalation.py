from pydantic import BaseModel, Field


class EscalationRequest(BaseModel):
    reason: str = Field(
        ...,
        min_length=5,
        max_length=1000,
    )

    remarks: str | None = Field(
        default=None,
        max_length=2000,
    )
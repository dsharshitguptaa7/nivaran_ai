from app.ai.pipeline import ai_pipeline


def predict_category(
    title: str,
    description: str,
) -> tuple[str, float]:
    return ai_pipeline.predict_category(title=title, description=description)
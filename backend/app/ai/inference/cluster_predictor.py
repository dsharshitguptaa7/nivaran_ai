from app.ai.pipeline import ai_pipeline


def predict_cluster(
    title: str,
    description: str,
) -> int:
    return ai_pipeline.predict_cluster(title=title, description=description)
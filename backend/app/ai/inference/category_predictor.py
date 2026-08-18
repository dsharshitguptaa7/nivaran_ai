from pathlib import Path

import joblib


BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = (
    BASE_DIR
    /"app"
    / "ai"
    / "models"
    / "category_classifier.joblib"
)

_model = None


def _load_model():
    global _model

    if _model is None:
        _model = joblib.load(MODEL_PATH)

    return _model


def predict_category(
    title: str,
    description: str,
) -> tuple[str, float]:

    model = _load_model()

    text = (
        f"{title.strip()}. "
        f"{description.strip()}"
    )

    probabilities = model.predict_proba([text])[0]

    classes = model.classes_

    best_index = probabilities.argmax()

    category = classes[best_index]
    confidence = float(probabilities[best_index])

    return category, confidence
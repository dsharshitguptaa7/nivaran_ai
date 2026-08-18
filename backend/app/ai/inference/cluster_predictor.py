from pathlib import Path

import joblib
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parents[3]

KMEANS_PATH = (
    BASE_DIR
    /"app"
    / "ai"
    / "models"
    / "grievance_kmeans.joblib"
)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

_embedding_model = None
_kmeans_model = None


def _load_models():

    global _embedding_model
    global _kmeans_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer(
            EMBEDDING_MODEL_NAME
        )

    if _kmeans_model is None:
        _kmeans_model = joblib.load(
            KMEANS_PATH
        )

    return _embedding_model, _kmeans_model


def predict_cluster(
    title: str,
    description: str,
) -> int:

    embedding_model, kmeans_model = (
        _load_models()
    )

    text = (
        f"{title.strip()}. "
        f"{description.strip()}"
    )

    embedding = embedding_model.encode(
        [text],
        normalize_embeddings=True,
    )

    cluster_id = kmeans_model.predict(
        embedding
    )[0]

    return int(cluster_id)
from pathlib import Path

import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)


BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = (
    BASE_DIR
    /"app"
    / "ai"
    / "models"
    / "semantic_category_classifier.joblib"
)

DATASET_PATH = (
    BASE_DIR.parent
    / "NIVARAN_AI_hard_grievance_dataset.csv"
)


# Load dataset
df = pd.read_csv(DATASET_PATH)

# Load saved semantic model
model_data = joblib.load(MODEL_PATH)

embedding_model_name = model_data["embedding_model"]
classifier = model_data["classifier"]

print("=" * 70)
print("SEMANTIC MODEL — HARD TEST")
print("=" * 70)

print(f"\nEmbedding model: {embedding_model_name}")

# Load Sentence Transformer
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer(
    embedding_model_name
)

# Prepare text
texts = (
    df["title"].fillna("").astype(str)
    + ". "
    + df["description"].fillna("").astype(str)
).tolist()

y_true = df["category_label"].tolist()

# Generate embeddings
print("\nGenerating embeddings...")

embeddings = embedding_model.encode(
    texts,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True,
)

print(
    "\nEmbedding shape:",
    embeddings.shape
)

# Predict
predictions = classifier.predict(embeddings)

# Accuracy
accuracy = accuracy_score(
    y_true,
    predictions,
)

print("\n" + "=" * 70)
print(f"Accuracy: {accuracy:.4f}")
print("=" * 70)

# Classification report
print("\nClassification Report:")

print(
    classification_report(
        y_true,
        predictions,
        zero_division=0,
    )
)

# Confusion matrix
labels = sorted(
    df["category_label"].unique()
)

cm = confusion_matrix(
    y_true,
    predictions,
    labels=labels,
)

print("\nConfusion Matrix:")
print(cm)

print("\nLabels:")

for i, label in enumerate(labels):
    print(f"{i}: {label}")

# Misclassified examples
df["prediction"] = predictions
df["correct"] = (
    df["category_label"]
    == df["prediction"]
)

errors = df[
    ~df["correct"]
]

print("\n" + "=" * 70)
print(
    f"MISCLASSIFIED: "
    f"{len(errors)} / {len(df)}"
)
print("=" * 70)

if len(errors) > 0:

    print(
        errors[
            [
                "title",
                "description",
                "category_label",
                "prediction",
            ]
        ].to_string(index=False)
    )

else:
    print("No misclassified examples.")
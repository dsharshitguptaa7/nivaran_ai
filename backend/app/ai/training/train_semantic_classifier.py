from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[3]

DATASET_PATH = (
    BASE_DIR.parent
    / "NIVARAN_AI_synthetic_grievance_dataset.csv"
)

MODEL_DIR = BASE_DIR / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = (
    MODEL_DIR
    / "semantic_category_classifier.joblib"
)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


# ============================================================
# LOAD DATASET
# ============================================================

print("=" * 70)
print("NIVARAN-AI SEMANTIC CATEGORY CLASSIFIER")
print("=" * 70)

print("\nLoading dataset...")

df = pd.read_csv(DATASET_PATH)

required_columns = {
    "title",
    "description",
    "category_label",
    "split",
}

missing_columns = required_columns - set(df.columns)

if missing_columns:
    raise ValueError(
        f"Missing required columns: {missing_columns}"
    )


# ============================================================
# PREPARE TEXT
# ============================================================

df["text"] = (
    df["title"].fillna("").astype(str)
    + ". "
    + df["description"].fillna("").astype(str)
)

train_df = df[df["split"] == "train"].copy()
validation_df = df[df["split"] == "validation"].copy()
test_df = df[df["split"] == "test"].copy()


X_train = train_df["text"].tolist()
y_train = train_df["category_label"].tolist()

X_validation = validation_df["text"].tolist()
y_validation = validation_df["category_label"].tolist()

X_test = test_df["text"].tolist()
y_test = test_df["category_label"].tolist()


print("\nDataset:")
print(f"Training samples:   {len(X_train)}")
print(f"Validation samples: {len(X_validation)}")
print(f"Test samples:       {len(X_test)}")
print(f"Categories:         {df['category_label'].nunique()}")


# ============================================================
# LOAD SENTENCE TRANSFORMER
# ============================================================

print("\nLoading Sentence Transformer...")

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL_NAME
)

print(
    f"Embedding model: {EMBEDDING_MODEL_NAME}"
)


# ============================================================
# GENERATE EMBEDDINGS
# ============================================================

print("\nGenerating training embeddings...")

train_embeddings = embedding_model.encode(
    X_train,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True,
)

print(
    "Training embedding shape:",
    train_embeddings.shape
)


print("\nGenerating validation embeddings...")

validation_embeddings = embedding_model.encode(
    X_validation,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True,
)

print(
    "Validation embedding shape:",
    validation_embeddings.shape
)


print("\nGenerating test embeddings...")

test_embeddings = embedding_model.encode(
    X_test,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True,
)

print(
    "Test embedding shape:",
    test_embeddings.shape
)


# ============================================================
# CLASSIFIER
# ============================================================

print("\nTraining Logistic Regression classifier...")

classifier = LogisticRegression(
    max_iter=2000,
    random_state=42,
    class_weight="balanced",
)

classifier.fit(
    train_embeddings,
    y_train,
)

print("Classifier training completed.")


# ============================================================
# VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("VALIDATION")
print("=" * 70)

validation_predictions = classifier.predict(
    validation_embeddings
)

validation_accuracy = accuracy_score(
    y_validation,
    validation_predictions,
)

print(
    f"\nValidation Accuracy: "
    f"{validation_accuracy:.4f}"
)

print("\nValidation Classification Report:")

print(
    classification_report(
        y_validation,
        validation_predictions,
        zero_division=0,
    )
)


# ============================================================
# TEST
# ============================================================

print("\n" + "=" * 70)
print("TEST")
print("=" * 70)

test_predictions = classifier.predict(
    test_embeddings
)

test_accuracy = accuracy_score(
    y_test,
    test_predictions,
)

print(
    f"\nTest Accuracy: "
    f"{test_accuracy:.4f}"
)

print("\nTest Classification Report:")

print(
    classification_report(
        y_test,
        test_predictions,
        zero_division=0,
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

labels = sorted(
    df["category_label"].unique()
)

cm = confusion_matrix(
    y_test,
    test_predictions,
    labels=labels,
)

print("\nConfusion Matrix:")

print(cm)

print("\nLabels:")

for index, label in enumerate(labels):
    print(f"{index}: {label}")


# ============================================================
# SAVE MODEL
# ============================================================

model_data = {
    "embedding_model": EMBEDDING_MODEL_NAME,
    "classifier": classifier,
    "labels": labels,
}

joblib.dump(
    model_data,
    MODEL_PATH,
)

print("\n" + "=" * 70)
print("MODEL SAVED")
print("=" * 70)

print(MODEL_PATH)
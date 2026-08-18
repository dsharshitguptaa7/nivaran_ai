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
    / "category_classifier.joblib"
)

DATASET_PATH = (
    BASE_DIR.parent
    / "NIVARAN_AI_hard_grievance_dataset.csv"
)


# Load
df = pd.read_csv(DATASET_PATH)
model = joblib.load(MODEL_PATH)


# Text
X = (
    df["title"].fillna("")
    + " "
    + df["description"].fillna("")
)

y = df["category_label"]


# Predict
predictions = model.predict(X)


# Metrics
accuracy = accuracy_score(y, predictions)

print("=" * 60)
print("INDEPENDENT UNSEEN TEST")
print("=" * 60)

print(f"\nAccuracy: {accuracy:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y,
        predictions,
        zero_division=0,
    )
)

print("\nConfusion Matrix:")
print(
    confusion_matrix(
        y,
        predictions,
    )
)


# Show mistakes
df["prediction"] = predictions
df["correct"] = df["category_label"] == df["prediction"]

errors = df[~df["correct"]]

print("\n" + "=" * 60)
print(f"MISCLASSIFIED: {len(errors)} / {len(df)}")
print("=" * 60)

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
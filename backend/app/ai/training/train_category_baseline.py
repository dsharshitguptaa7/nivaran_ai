from pathlib import Path

import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.pipeline import Pipeline


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[3]

DATASET_PATH = (
    BASE_DIR.parent
    / "NIVARAN_AI_synthetic_grievance_dataset.csv"
)

MODEL_DIR = BASE_DIR / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "category_classifier.joblib"


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

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
        f"Missing columns: {missing_columns}"
    )


# --------------------------------------------------
# Prepare text
# --------------------------------------------------

df["text"] = (
    df["title"].fillna("")
    + " "
    + df["description"].fillna("")
)

train_df = df[df["split"] == "train"].copy()
validation_df = df[df["split"] == "validation"].copy()
test_df = df[df["split"] == "test"].copy()

X_train = train_df["text"]
y_train = train_df["category_label"]

X_validation = validation_df["text"]
y_validation = validation_df["category_label"]

X_test = test_df["text"]
y_test = test_df["category_label"]


# --------------------------------------------------
# Model
# --------------------------------------------------

model = Pipeline(
    [
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.95,
                sublinear_tf=True,
            ),
        ),
        (
            "classifier",
            LogisticRegression(
                max_iter=2000,
                random_state=42,
            ),
        ),
    ]
)


# --------------------------------------------------
# Training
# --------------------------------------------------

print("Training baseline classifier...")

model.fit(X_train, y_train)

print("Training completed.")


# --------------------------------------------------
# Validation
# --------------------------------------------------

validation_predictions = model.predict(X_validation)

validation_accuracy = accuracy_score(
    y_validation,
    validation_predictions,
)

print("\nValidation Accuracy:")
print(f"{validation_accuracy:.4f}")


# --------------------------------------------------
# Test
# --------------------------------------------------

test_predictions = model.predict(X_test)

test_accuracy = accuracy_score(
    y_test,
    test_predictions,
)

print("\nTest Accuracy:")
print(f"{test_accuracy:.4f}")


print("\nClassification Report:")
print(
    classification_report(
        y_test,
        test_predictions,
        zero_division=0,
    )
)


print("\nConfusion Matrix:")
print(
    confusion_matrix(
        y_test,
        test_predictions,
    )
)


# --------------------------------------------------
# Save model
# --------------------------------------------------

joblib.dump(model, MODEL_PATH)

print("\nModel saved to:")
print(MODEL_PATH)
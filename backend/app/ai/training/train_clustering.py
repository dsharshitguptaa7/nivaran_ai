from pathlib import Path

import joblib
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


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


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

df = pd.read_csv(DATASET_PATH)

df["text"] = (
    df["title"].fillna("")
    + ". "
    + df["description"].fillna("")
)

texts = df["text"].tolist()


# --------------------------------------------------
# Sentence Transformer
# --------------------------------------------------

MODEL_NAME = "all-MiniLM-L6-v2"

print("Loading embedding model...")
embedding_model = SentenceTransformer(MODEL_NAME)

print("Generating embeddings...")

embeddings = embedding_model.encode(
    texts,
    batch_size=32,
    show_progress_bar=True,
    normalize_embeddings=True,
)

print("Embedding shape:", embeddings.shape)


# --------------------------------------------------
# Evaluate different K values
# --------------------------------------------------

k_values = [8, 10, 12, 14, 16, 18, 20]

results = []

for k in k_values:

    print(f"\nTesting K = {k}")

    kmeans = KMeans(
        n_clusters=k,
        random_state=42,
        n_init=10,
    )

    cluster_labels = kmeans.fit_predict(embeddings)

    score = silhouette_score(
        embeddings,
        cluster_labels,
    )

    results.append(
        {
            "k": k,
            "silhouette_score": score,
        }
    )

    print(
        f"Silhouette Score: {score:.4f}"
    )


# --------------------------------------------------
# Best K
# --------------------------------------------------

results_df = pd.DataFrame(results)

best_row = results_df.loc[
    results_df["silhouette_score"].idxmax()
]

best_k = int(best_row["k"])

print("\n" + "=" * 50)
print("BEST K")
print("=" * 50)

print(f"K = {best_k}")
print(
    f"Silhouette Score = "
    f"{best_row['silhouette_score']:.4f}"
)


# --------------------------------------------------
# Train final clustering model
# --------------------------------------------------

final_kmeans = KMeans(
    n_clusters=best_k,
    random_state=42,
    n_init=10,
)

df["cluster_id"] = final_kmeans.fit_predict(
    embeddings
)


# --------------------------------------------------
# Cluster distribution
# --------------------------------------------------

print("\nCluster distribution:")

print(
    df["cluster_id"]
    .value_counts()
    .sort_index()
)


# --------------------------------------------------
# Save results
# --------------------------------------------------

results_path = (
    MODEL_DIR / "clustering_k_evaluation.csv"
)

results_df.to_csv(
    results_path,
    index=False,
)


clustered_data_path = (
    MODEL_DIR / "clustered_grievances.csv"
)

df.to_csv(
    clustered_data_path,
    index=False,
)


model_path = (
    MODEL_DIR / "grievance_kmeans.joblib"
)

joblib.dump(
    final_kmeans,
    model_path,
)


print("\nSaved:")
print(results_path)
print(clustered_data_path)
print(model_path)
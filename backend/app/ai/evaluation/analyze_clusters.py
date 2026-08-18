from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]

DATASET_PATH = (
    BASE_DIR
    /"app"
    / "ai"
    / "models"
    / "clustered_grievances.csv"
)

df = pd.read_csv(DATASET_PATH)


print("=" * 70)
print("CLUSTER ANALYSIS")
print("=" * 70)


for cluster_id in sorted(df["cluster_id"].unique()):

    cluster = df[
        df["cluster_id"] == cluster_id
    ]

    print("\n" + "=" * 70)
    print(f"CLUSTER {cluster_id}")
    print("=" * 70)

    print(f"Size: {len(cluster)}")

    print("\nCategory distribution:")

    category_counts = (
        cluster["category_label"]
        .value_counts()
    )

    print(category_counts.to_string())

    print("\nTop category:")

    print(
        category_counts.index[0],
        "->",
        category_counts.iloc[0],
    )

    print("\nRepresentative grievances:")

    samples = cluster.sample(
        min(5, len(cluster)),
        random_state=42,
    )

    for _, row in samples.iterrows():

        print(
            f"\nTitle: {row['title']}"
        )

        print(
            f"Description: "
            f"{row['description']}"
        )

        print(
            f"Category: "
            f"{row['category_label']}"
        )
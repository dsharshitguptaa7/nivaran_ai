from app.ai.inference.cluster_predictor import predict_cluster


tests = [
    (
        "Fellowship payment pending",
        "My research scholarship amount has not been credited.",
    ),
    (
        "Thesis submission acknowledgement",
        "I submitted my thesis but have not received the acknowledgement.",
    ),
    (
        "Research supervisor issue",
        "There is an issue regarding my research guide.",
    ),
]


for title, description in tests:

    cluster = predict_cluster(
        title,
        description,
    )

    print("\nTitle:", title)
    print("Cluster:", cluster)
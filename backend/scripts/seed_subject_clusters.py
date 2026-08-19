from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.subject_cluster import SubjectCluster


SUBJECT_CLUSTERS = [
    (
        1,
        "Cluster 1",
        "ankit.trivedi@nivaran.local",
    ),
    (
        2,
        "Cluster 2",
        "pooja.singh@nivaran.local",
    ),
    (
        3,
        "Cluster 3",
        "priyanka.maurya@nivaran.local",
    ),
    (
        4,
        "Cluster 4",
        "dipesh.verma@nivaran.local",
    ),
    (
        5,
        "Cluster 5",
        "adarsh.srivastav@nivaran.local",
    ),
    (
        6,
        "Cluster 6",
        "pravin.agarwal@nivaran.local",
    ),
    (
        7,
        "Cluster 7",
        "shashi.mishra@nivaran.local",
    ),
    (
        8,
        "Cluster 8",
        "priyanka.gupta@nivaran.local",
    ),
    (
        9,
        "Cluster 9",
        "anjani.upadhayay@nivaran.local",
    ),
    (
        10,
        "Cluster 10",
        "samiuddin@nivaran.local",
    ),
]


def seed_subject_clusters():
    db = SessionLocal()

    try:
        for cluster_number, cluster_name, assistant_email in SUBJECT_CLUSTERS:

            assistant_dean = (
                db.query(User)
                .filter(
                    User.email == assistant_email,
                    User.role == UserRole.ASSISTANT_DEAN,
                    User.is_active.is_(True),
                )
                .first()
            )

            if assistant_dean is None:
                raise ValueError(
                    f"Assistant Dean not found: {assistant_email}"
                )

            existing_cluster = (
                db.query(SubjectCluster)
                .filter(
                    SubjectCluster.cluster_number == cluster_number
                )
                .first()
            )

            if existing_cluster:
                print(
                    f"Cluster {cluster_number} already exists. "
                    f"Skipping."
                )
                continue

            cluster = SubjectCluster(
                cluster_number=cluster_number,
                name=cluster_name,
                assistant_dean_id=assistant_dean.id,
                is_active=True,
            )

            db.add(cluster)

            print(
                f"Created Cluster {cluster_number} "
                f"→ {assistant_dean.full_name}"
            )

        db.commit()

        print("\nSubject cluster seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_subject_clusters()
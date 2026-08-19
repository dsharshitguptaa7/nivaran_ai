from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.grievance_cluster import GrievanceCluster


GRIEVANCE_CLUSTERS = [
    (
        1,
        "Cluster 1",
        "arun.gupta@nivaran.local",
    ),
    (
        2,
        "Cluster 2",
        "manas.upadhyay@nivaran.local",
    ),
    (
        3,
        "Cluster 3",
        "sweta.pandey@nivaran.local",
    ),
]


def seed_grievance_clusters():
    db = SessionLocal()

    try:
        for cluster_number, cluster_name, associate_email in GRIEVANCE_CLUSTERS:

            associate_dean = (
                db.query(User)
                .filter(
                    User.email == associate_email,
                    User.role == UserRole.ASSOCIATE_DEAN,
                    User.is_active.is_(True),
                )
                .first()
            )

            if associate_dean is None:
                raise ValueError(
                    f"Associate Dean not found: {associate_email}"
                )

            existing_cluster = (
                db.query(GrievanceCluster)
                .filter(
                    GrievanceCluster.cluster_number == cluster_number
                )
                .first()
            )

            if existing_cluster:
                print(
                    f"Cluster {cluster_number} already exists. "
                    f"Skipping."
                )
                continue

            cluster = GrievanceCluster(
                cluster_number=cluster_number,
                name=cluster_name,
                associate_dean_id=associate_dean.id,
                is_active=True,
            )

            db.add(cluster)

            print(
                f"Created Cluster {cluster_number} "
                f"→ {associate_dean.full_name}"
            )

        db.commit()

        print(
            "\nGrievance cluster seed completed successfully."
        )

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_grievance_clusters()
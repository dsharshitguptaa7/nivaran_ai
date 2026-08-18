import sys
from pathlib import Path

# Add backend/ to Python path
BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.cluster import Cluster


def seed_clusters():
    db = SessionLocal()

    try:
        for cluster_number in range(18):
            existing = db.scalar(
                select(Cluster).where(
                    Cluster.cluster_number == cluster_number
                )
            )

            if existing:
                continue

            cluster = Cluster(
                cluster_number=cluster_number,
                name=f"Cluster {cluster_number}",
                description=(
                    f"NIVARAN-AI K-Means semantic cluster "
                    f"{cluster_number}"
                ),
                algorithm="KMeans",
                model_version="0.1.0",
                is_active=True,
            )

            db.add(cluster)

        db.commit()
        print("18 clusters seeded successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_clusters()
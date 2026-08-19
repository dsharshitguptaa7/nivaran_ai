from app.db.database import SessionLocal
from app.models.subject import Subject
from app.models.subject_cluster import SubjectCluster


SUBJECT_CLUSTERS = {
    1: [
        "Philosophy",
        "Mathematics",
        "Economics",
        "Urdu",
    ],

    2: [
        "Home Science",
        "Music",
        "Psychology",
        "Business Management",
        "English Literature",
    ],

    3: [
        "Zoology",
        "Chemistry",
        "Pharmacy",
        "Geography",
    ],

    4: [
        "Botany",
        "Microbiology",
        "Biochemistry",
        "Commerce",
    ],

    5: [
        "Hindi Literature",
        "Sociology",
        "Statistics",
    ],

    6: [
        "Physical Education",
        "Sanskrit",
        "Yoga",
        "Life Science",
        "Biotechnology",
    ],

    7: [
        "Deen Dayal Sodh Kendra",
        "Hindu Studies",
        "Library and Information Science",
        "Journalism and Mass Communication",
        "Food Technology",
        "Education/Education Training",
    ],

    8: [
        "Political Science",
        "Law",
        "Chemical Engineering",
        "Electronics and Communication Engineering",
        "Mechanical Engineering",
    ],

    9: [
        "Drawing and Painting",
        "Physics",
        "Defence and Strategies",
        "History",
        "MLT",
        "Physiotherapy",
    ],

    10: [
        "Social Work",
        "Life Long Engineering",
        "Computer Application",
        "Computer Science and Engineering",
        "Soil Science",
        "Genetics and Plant Breeding",
        "Agronomy",
        "Agricultural Economics",
        "Soil Conservation",
        "Horticulture",
        "Agricultural Chemistry",
        "Agriculture Entomology",
        "Plant Pathology",
        "Agriculture Extension",
    ],
}


def seed_subjects():
    db = SessionLocal()

    try:
        for cluster_number, subject_names in SUBJECT_CLUSTERS.items():

            cluster = (
                db.query(SubjectCluster)
                .filter(
                    SubjectCluster.cluster_number == cluster_number,
                    SubjectCluster.is_active.is_(True),
                )
                .first()
            )

            if cluster is None:
                raise ValueError(
                    f"Subject Cluster {cluster_number} not found."
                )

            for subject_name in subject_names:

                existing_subject = (
                    db.query(Subject)
                    .filter(Subject.name == subject_name)
                    .first()
                )

                if existing_subject:
                    print(
                        f"Already exists: {subject_name} "
                        f"(Cluster {cluster_number})"
                    )
                    continue

                subject = Subject(
                    name=subject_name,
                    subject_cluster_id=cluster.id,
                    is_active=True,
                )

                db.add(subject)

                print(
                    f"Created: {subject_name} "
                    f"→ Cluster {cluster_number}"
                )

        db.commit()

        print("\nSubject seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_subjects()
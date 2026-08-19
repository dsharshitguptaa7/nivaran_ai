from app.db.database import SessionLocal
from app.models.category import Category, CategoryRoutingType
from app.models.grievance_cluster import GrievanceCluster
from app.models.user import User, UserRole


GRIEVANCE_CLUSTER_MAPPING = {
    1: [
        "PhD_Admission",
        "Registration",
        "Supervisor_Related",
    ],

    2: [
        "Course_Work",
        "RAC",
        "RDC",
        "FT_PT_Conversion",
    ],

    3: [
        "Publication_Verification",
        "Thesis_Submission",
        "Thesis_Evaluation",
    ],
}


SUBJECT_ASSISTANT_DEAN_CATEGORIES = [
    "Viva",
    "Fee",
    "Portal_Data_Correction",
    "Other",
]


FIXED_AUTHORITY_MAPPING = {
    "RTI_IIGRS": "samiuddin@nivaran.local",
    "Fellowship": "dipesh.verma@nivaran.local",
}


def seed_category_routing():
    db = SessionLocal()

    try:
        # =====================================================
        # 1. GRIEVANCE CLUSTER ROUTING
        # =====================================================

        for cluster_number, category_names in GRIEVANCE_CLUSTER_MAPPING.items():

            cluster = (
                db.query(GrievanceCluster)
                .filter(
                    GrievanceCluster.cluster_number == cluster_number,
                    GrievanceCluster.is_active.is_(True),
                )
                .first()
            )

            if cluster is None:
                raise ValueError(
                    f"Grievance Cluster {cluster_number} not found."
                )

            for category_name in category_names:

                category = (
                    db.query(Category)
                    .filter(
                        Category.name == category_name,
                        Category.is_active.is_(True),
                    )
                    .first()
                )

                if category is None:
                    raise ValueError(
                        f"Category not found: {category_name}"
                    )

                category.routing_type = (
                    CategoryRoutingType.GRIEVANCE_CLUSTER
                )

                category.grievance_cluster_id = cluster.id
                category.fixed_authority_id = None

                print(
                    f"{category_name} "
                    f"→ Grievance Cluster {cluster_number}"
                )

        # =====================================================
        # 2. SUBJECT ASSISTANT DEAN ROUTING
        # =====================================================

        for category_name in SUBJECT_ASSISTANT_DEAN_CATEGORIES:

            category = (
                db.query(Category)
                .filter(
                    Category.name == category_name,
                    Category.is_active.is_(True),
                )
                .first()
            )

            if category is None:
                raise ValueError(
                    f"Category not found: {category_name}"
                )

            category.routing_type = (
                CategoryRoutingType.SUBJECT_ASSISTANT_DEAN
            )

            category.grievance_cluster_id = None
            category.fixed_authority_id = None

            print(
                f"{category_name} "
                f"→ Subject Assistant Dean"
            )

        # =====================================================
        # 3. FIXED AUTHORITY ROUTING
        # =====================================================

        for category_name, authority_email in FIXED_AUTHORITY_MAPPING.items():

            category = (
                db.query(Category)
                .filter(
                    Category.name == category_name,
                    Category.is_active.is_(True),
                )
                .first()
            )

            if category is None:
                raise ValueError(
                    f"Category not found: {category_name}"
                )

            authority = (
                db.query(User)
                .filter(
                    User.email == authority_email,
                    User.role == UserRole.ASSISTANT_DEAN,
                    User.is_active.is_(True),
                )
                .first()
            )

            if authority is None:
                raise ValueError(
                    f"Authority not found: {authority_email}"
                )

            category.routing_type = (
                CategoryRoutingType.FIXED_AUTHORITY
            )

            category.grievance_cluster_id = None
            category.fixed_authority_id = authority.id

            print(
                f"{category_name} "
                f"→ {authority.full_name}"
            )

        db.commit()

        print(
            "\nCategory routing seed completed successfully."
        )

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_category_routing()
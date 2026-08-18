from celery import Celery


celery_app = Celery(
    "nivaran_ai",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=[
        "app.tasks.reminder_tasks",
    ],
)


celery_app.conf.update(
    timezone="Asia/Kolkata",
    enable_utc=True,

    beat_schedule={
        "check-overdue-grievances": {
            "task": "app.tasks.reminder_tasks.check_overdue_grievances",
            "schedule": 3600.0,
        },
    },
)
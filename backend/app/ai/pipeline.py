import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib

# Ensure huggingface and tokenizers never block or make remote HTTP requests
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

logger = logging.getLogger("nivaran_ai.pipeline")

# ==============================================================================
# BASE PATHS & CONSTANTS
# ==============================================================================
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

BASELINE_CLASSIFIER_PATH = MODELS_DIR / "category_classifier.joblib"
SEMANTIC_CLASSIFIER_PATH = MODELS_DIR / "semantic_category_classifier.joblib"
KMEANS_CLUSTER_PATH = MODELS_DIR / "grievance_kmeans.joblib"

DEFAULT_MODEL_NAME = "NIVARAN-AI-NLP"
DEFAULT_MODEL_VERSION = "2.0.0"
FALLBACK_CATEGORY = "Other"
FALLBACK_CONFIDENCE = 0.50


class AIPipeline:
    """
    Unified, thread-safe AI Inference Pipeline for NIVARAN-AI.
    Manages NLP preprocessing, category classification, clustering, and confidence scoring.
    """

    def __init__(self):
        self._baseline_model = None
        self._semantic_model_data = None
        self._embedding_model = None
        self._kmeans_model = None
        self._initialized = False

    def initialize(self) -> None:
        """Pre-load and cache machine learning models in memory."""
        if self._initialized:
            return

        # 1. Load Baseline Category Classifier (TF-IDF + Classifier Pipeline)
        if BASELINE_CLASSIFIER_PATH.exists():
            try:
                self._baseline_model = joblib.load(BASELINE_CLASSIFIER_PATH)
                logger.info("[AI Pipeline] Baseline category classifier loaded successfully.")
            except Exception as e:
                logger.warning(f"[AI Pipeline] Failed to load baseline classifier: {e}")

        # 2. Load Semantic Category Classifier
        if SEMANTIC_CLASSIFIER_PATH.exists():
            try:
                self._semantic_model_data = joblib.load(SEMANTIC_CLASSIFIER_PATH)
                logger.info("[AI Pipeline] Semantic category classifier metadata loaded.")
            except Exception as e:
                logger.warning(f"[AI Pipeline] Failed to load semantic classifier: {e}")

        # 3. Load KMeans Cluster Model
        if KMEANS_CLUSTER_PATH.exists():
            try:
                self._kmeans_model = joblib.load(KMEANS_CLUSTER_PATH)
                logger.info("[AI Pipeline] Grievance KMeans clustering model loaded.")
            except Exception as e:
                logger.warning(f"[AI Pipeline] Failed to load KMeans model: {e}")

        self._initialized = True

    def _get_embedding_model(self):
        """Lazy-load SentenceTransformer safely without remote network stall."""
        if self._embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("[AI Pipeline] SentenceTransformer embeddings initialized.")
            except Exception as e:
                logger.warning(f"[AI Pipeline] Could not load SentenceTransformer: {e}")
        return self._embedding_model

    def preprocess_text(self, title: Optional[str], description: Optional[str]) -> str:
        """Sanitize and format grievance text for inference."""
        clean_title = (title or "").strip()
        clean_desc = (description or "").strip()

        if clean_title and clean_desc:
            combined = f"{clean_title}. {clean_desc}"
        elif clean_title:
            combined = clean_title
        elif clean_desc:
            combined = clean_desc
        else:
            combined = "General research grievance inquiry."

        return combined

    def predict_category(self, title: Optional[str], description: Optional[str]) -> Tuple[str, float]:
        """
        Predicts category name and confidence score [0.0 - 1.0].
        Employs baseline model with fallback mechanisms.
        """
        self.initialize()
        text = self.preprocess_text(title, description)

        # Attempt 1: Baseline Classifier (Fast, Accurate TF-IDF Pipeline)
        if self._baseline_model is not None:
            try:
                probs = self._baseline_model.predict_proba([text])[0]
                classes = self._baseline_model.classes_
                best_idx = probs.argmax()
                category = str(classes[best_idx])
                confidence = float(probs[best_idx])
                return category, round(confidence, 4)
            except Exception as e:
                logger.warning(f"[AI Pipeline] Baseline classification inference failed: {e}")

        # Attempt 2: Semantic Classifier Fallback
        if self._semantic_model_data is not None:
            try:
                clf = self._semantic_model_data.get("classifier")
                labels = self._semantic_model_data.get("labels", [])
                emb_model = self._get_embedding_model()
                if clf is not None and emb_model is not None:
                    emb = emb_model.encode([text], normalize_embeddings=True)
                    probs = clf.predict_proba(emb)[0]
                    best_idx = probs.argmax()
                    category = str(labels[best_idx]) if best_idx < len(labels) else str(clf.classes_[best_idx])
                    confidence = float(probs[best_idx])
                    return category, round(confidence, 4)
            except Exception as e:
                logger.warning(f"[AI Pipeline] Semantic classification fallback failed: {e}")

        # Attempt 3: Safe Rule-Based Heuristic Fallback
        lower_text = text.lower()
        if any(w in lower_text for w in ["fellowship", "scholarship", "stipend", "jrf", "srf", "disbursement", "contingency"]):
            return "Fellowship", 0.75
        if any(w in lower_text for w in ["thesis", "synopsis", "dissertation"]):
            return "Thesis_Submission", 0.70
        if any(w in lower_text for w in ["guide", "supervisor", "co-supervisor"]):
            return "Supervisor_Related", 0.70
        if any(w in lower_text for w in ["fee", "payment", "challan", "dues"]):
            return "Fee", 0.75
        if any(w in lower_text for w in ["viva", "defense", "oral exam"]):
            return "Viva", 0.75
        if any(w in lower_text for w in ["coursework", "course work", "exam", "grade", "marksheet"]):
            return "Course_Work", 0.70
        if any(w in lower_text for w in ["admission", "entrance", "ret"]):
            return "PhD_Admission", 0.75

        return FALLBACK_CATEGORY, FALLBACK_CONFIDENCE

    def predict_cluster(self, title: Optional[str], description: Optional[str]) -> int:
        """Predicts academic/domain cluster number."""
        self.initialize()
        text = self.preprocess_text(title, description)

        if self._kmeans_model is not None:
            try:
                emb_model = self._get_embedding_model()
                if emb_model is not None:
                    emb = emb_model.encode([text], normalize_embeddings=True)
                    cluster_id = self._kmeans_model.predict(emb)[0]
                    return int(cluster_id)
            except Exception as e:
                logger.warning(f"[AI Pipeline] Cluster prediction failed: {e}")

        return 1

    def process_grievance_text(
        self,
        title: Optional[str],
        description: Optional[str],
    ) -> Dict[str, Any]:
        """
        Executes complete AI pipeline, returning category, confidence, cluster,
        and latency metrics in a structured dictionary.
        """
        start_time = time.perf_counter()

        category, confidence = self.predict_category(title, description)
        cluster_id = self.predict_cluster(title, description)

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "predicted_category": category,
            "confidence_score": confidence,
            "cluster_id": cluster_id,
            "processing_time_ms": latency_ms,
            "model_name": DEFAULT_MODEL_NAME,
            "model_version": DEFAULT_MODEL_VERSION,
        }


# Singleton pipeline instance
ai_pipeline = AIPipeline()

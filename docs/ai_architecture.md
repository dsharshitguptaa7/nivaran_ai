# NIVARAN-AI — AI Grievance Classification Architecture

## 1. Machine Learning & NLP Pipeline

The AI engine in NIVARAN-AI automatically classifies raw unstructured text (grievance title + detailed description) into university-defined administrative categories and academic clusters.

```text
 ┌──────────────────────────────────────┐
 │    Raw Grievance Input               │
 │  (Title + Description text)          │
 └──────────────────┬───────────────────┘
                    │
                    ▼
 ┌──────────────────────────────────────┐
 │  Text Preprocessing & Sanitization   │
 │ • Lowercasing & strip punctuation    │
 │ • Tokenization & Stopword filtering  │
 │ • University domain token preservation
 └──────────────────┬───────────────────┘
                    │
                    ▼
 ┌──────────────────────────────────────┐
 │     TF-IDF Feature Extraction        │
 │ • N-gram range: (1, 2)               │
 │ • Sublinear TF scaling               │
 │ • 5,000 top vocabulary dimensions    │
 └──────────────────┬───────────────────┘
                    │
                    ▼
 ┌──────────────────────────────────────┐
 │   Classifier / Embedding Matching    │
 │ • Multi-class Naive Bayes / RF / Cos │
 │ • Category Probability Distribution  │
 └──────────────────┬───────────────────┘
                    │
                    ▼
 ┌──────────────────────────────────────┐
 │  Inference & Confidence Scoring      │
 │ • Predicted Category ID              │
 │ • Confidence Score: [0.00 – 1.00]     │
 │ • High Confidence Flag: conf >= 0.75  │
 └──────────────────┬───────────────────┘
                    │
                    ▼
 ┌──────────────────────────────────────┐
 │  Audit & Human-in-the-Loop Storage   │
 │ • Saved to ai_processing_records     │
 │ • Rendered on Manager Review UI      │
 └──────────────────────────────────────┘
```

---

## 2. Model Execution & Confidence Scoring

### Inference Output Structure
When a grievance is submitted, the backend schedules an asynchronous task:
```python
prediction = predict_category(title=grievance.title, description=grievance.description)
```

The prediction returns:
- `category_id`: UUID of predicted category.
- `category_name`: Human-readable category (e.g., "Fellowship & Contingency Disbursement").
- `confidence`: Decimal score between `0.00` and `1.00`.
- `cluster_id`: Associated academic cluster ID.

### Confidence Threshold Policy
- **Confidence $\ge 0.75$**: Marked as **High Confidence**; recommended category highlighted with green badge on Manager dashboard.
- **Confidence $< 0.75$**: Marked as **Low / Medium Confidence**; Manager prompted to double-check classification with full category dropdown.

---

## 3. Human-in-the-Loop (HITL) Validation & Audit Trail

NIVARAN-AI enforces strict administrative accountability by maintaining complete telemetry on AI predictions and human overrides in the `ai_processing_records` table:

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Unique record identifier |
| `grievance_id` | `UUID` | Associated grievance reference |
| `model_name` | `VARCHAR(100)` | Name/version of ML model used (e.g. `TFIDF_MultinomialNB_v1.0`) |
| `model_version` | `VARCHAR(50)` | Version tag of active inference weights |
| `predicted_category_id` | `UUID` | Category predicted by model |
| `confidence_score` | `FLOAT` | Classification certainty score (0.0 to 1.0) |
| `processing_time_ms` | `INTEGER` | Inference execution latency in milliseconds |
| `is_overridden` | `BOOLEAN` | `True` if Manager selected a different category |
| `final_category_id` | `UUID` | The category confirmed and dispatched by the Manager |
| `reviewed_by` | `UUID` | User ID of the Manager who verified the case |
| `reviewed_at` | `TIMESTAMP` | Timestamp of human verification |

---

## 4. Retraining & Continuous Improvement

1. **Dataset Export**: Discrepancies between `predicted_category_id` and `final_category_id` form an active learning feedback loop.
2. **Dataset Storage**:
   - `NIVARAN_AI_synthetic_grievance_dataset.csv`: Base synthetic training corpus.
   - `NIVARAN_AI_hard_grievance_dataset.csv`: Challenging edge cases and overlapping domain examples.
   - `NIVARAN_AI_independent_unseen_test.csv`: Out-of-sample benchmark dataset for accuracy validation.

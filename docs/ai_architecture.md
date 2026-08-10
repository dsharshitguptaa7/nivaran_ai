# NIVARAN-AI — AI Architecture

## 1. AI Objective

NIVARAN-AI uses Artificial Intelligence to assist in:

- Automatic grievance categorization
- Subject/topic clustering
- Intelligent grievance routing
- Similar grievance identification
- Confidence-based human review
- AI-assisted decision support

The AI system is designed as an assistive component.
Final administrative decisions remain under authorized human control.

---

# 2. AI Architecture Overview

The AI subsystem is designed as an independent service layer
within the NIVARAN-AI backend.

```text
                    ┌─────────────────────┐
                    │ Grievance Submitted │
                    └──────────┬──────────┘
                               │
                               ↓
                    ┌─────────────────────┐
                    │ Text Preprocessing  │
                    └──────────┬──────────┘
                               │
                               ↓
                    ┌─────────────────────┐
                    │ Feature Extraction  │
                    │ / Embeddings        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ↓                     ↓
          ┌─────────────────┐    ┌─────────────────┐
          │   Category      │    │    Clustering   │
          │  Classification │    │    / Similarity │
          └────────┬────────┘    └────────┬────────┘
                   │                      │
                   └──────────┬───────────┘
                              ↓
                    ┌─────────────────────┐
                    │ Confidence /        │
                    │ Similarity Evaluation│
                    └──────────┬──────────┘
                               │
                               ↓
                    ┌─────────────────────┐
                    │ Human Review        │
                    └──────────┬──────────┘
                               │
                               ↓
                    ┌─────────────────────┐
                    │ Routing / Assignment│
                    └─────────────────────┘
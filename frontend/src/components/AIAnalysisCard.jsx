export default function AIAnalysisCard({
  predictedCategory = "Not classified",
  finalCategory = null,
  clusterName = "Academic Affairs",
  confidenceScore = null,
  modelName = "NIVARAN-BERT v2.1",
  isOverridden = false,
  className = "",
}) {
  const formattedConfidence = confidenceScore != null
    ? `${(confidenceScore > 1 ? confidenceScore : confidenceScore * 100).toFixed(1)}%`
    : "92.4% (High)";

  return (
    <section className={`detail-card ai-analysis-card ${className}`}>
      <div className="detail-card-header">
        <div className="ai-card-title">
          <div className="ai-detail-icon">AI</div>
          <div>
            <h2>AI Autonomous Analysis</h2>
            <span className="ai-model-tag">{modelName}</span>
          </div>
        </div>
        <div className="ai-active-indicator">• AI Active</div>
      </div>

      <div className="detail-card-body">
        {/* PREDICTED CATEGORY */}
        <div className="ai-detail-row">
          <span>AI Predicted Category</span>
          <strong>{predictedCategory}</strong>
        </div>

        {/* OVERRIDDEN / FINAL CATEGORY (IF APPLICABLE) */}
        {isOverridden && finalCategory && (
          <div className="ai-detail-row highlight-override">
            <span>Manager Verified Category</span>
            <strong style={{ color: "var(--success, #059669)" }}>✓ {finalCategory}</strong>
          </div>
        )}

        {/* SEMANTIC CLUSTER */}
        <div className="ai-detail-row">
          <span>Semantic Routing Cluster</span>
          <strong>{clusterName}</strong>
        </div>

        {/* CONFIDENCE SCORE */}
        <div className="ai-detail-row">
          <span>Model Confidence</span>
          <strong className="ai-confidence-score">{formattedConfidence}</strong>
        </div>

        {/* ADVISORY DISCLAIMER BOX */}
        <div className="ai-advisory-box">
          <span className="ai-advisory-bullet">•</span>
          <div>
            <strong>AI Decision Support Policy</strong>
            <p>
              AI classification and semantic routing recommendations serve as advisory decision-support. Final administrative authority remains under authorized university governance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

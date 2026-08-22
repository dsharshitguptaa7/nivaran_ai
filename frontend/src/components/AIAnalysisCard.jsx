import React from "react";
import { Layers, Tag, GitBranch, Gauge, Info, CheckCircle2 } from "lucide-react";

export default function AIAnalysisCard({
  predictedCategory,
  finalCategory,
  clusterName,
  confidenceScore,
  modelName = "NIVARAN-BERT v2.1",
  isOverridden = false,
  className = "",
}) {
  const numericConf =
    confidenceScore != null
      ? confidenceScore > 1
        ? confidenceScore
        : confidenceScore * 100
      : null;

  const formattedConfidence =
    numericConf != null ? `${numericConf.toFixed(1)}%` : "Not available";

  // Confidence color calibration
  let confColor = "#2563eb"; // blue
  if (numericConf != null) {
    if (numericConf >= 80) confColor = "#059669"; // green
    else if (numericConf >= 60) confColor = "#d97706"; // amber
    else confColor = "#64748b"; // slate
  }

  return (
    <section className={`detail-card classification-routing-card ${className}`}>
      {/* CARD HEADER */}
      <div className="detail-card-header">
        <div className="detail-card-title-wrap">
          <Layers size={18} className="classification-icon text-slate-700" />
          <div>
            <h2>Classification & Case Routing</h2>
            <span className="classification-model-text">
              Inference Framework: {modelName}
            </span>
          </div>
        </div>

        <div className="classification-status-pill">
          <span className="classification-status-dot" />
          <span>Automated Classification</span>
        </div>
      </div>

      {/* 3-COLUMN METRICS GRID */}
      <div className="classification-metrics-grid">
        {/* Metric 1: Predicted Category */}
        <div className="classification-metric-cell">
          <div className="metric-cell-label">
            <Tag size={13} className="text-slate-500" />
            <span>PREDICTED CATEGORY</span>
          </div>
          <strong className="metric-cell-value">
            {predictedCategory || "Not classified"}
          </strong>
          {isOverridden && finalCategory && (
            <div className="metric-override-tag">
              <CheckCircle2 size={12} />
              <span>Manager Final: {finalCategory}</span>
            </div>
          )}
        </div>

        {/* Metric 2: Routing Cluster */}
        <div className="classification-metric-cell">
          <div className="metric-cell-label">
            <GitBranch size={13} className="text-slate-500" />
            <span>SEMANTIC ROUTING CLUSTER</span>
          </div>
          <strong className="metric-cell-value text-slate-800">
            {clusterName || "Academic Affairs"}
          </strong>
          <span className="metric-cell-sub">Domain Routing Channel</span>
        </div>

        {/* Metric 3: Model Confidence */}
        <div className="classification-metric-cell">
          <div className="metric-cell-label">
            <Gauge size={13} className="text-slate-500" />
            <span>MODEL CONFIDENCE</span>
          </div>
          <div className="metric-confidence-wrap">
            <strong className="metric-cell-value" style={{ color: confColor }}>
              {formattedConfidence}
            </strong>
            {numericConf != null && (
              <div className="confidence-progress-track">
                <div
                  className="confidence-progress-bar"
                  style={{
                    width: `${Math.min(numericConf, 100)}%`,
                    backgroundColor: confColor,
                  }}
                />
              </div>
            )}
          </div>
          <span className="metric-cell-sub">Predictive Certainty Index</span>
        </div>
      </div>

      {/* POLICY / ADVISORY DISCLAIMER */}
      <div className="classification-advisory-box">
        <Info size={15} className="advisory-info-icon" />
        <p className="advisory-text">
          Classification and routing recommendations are advisory decision-support. Final administrative determination remains under authorized university governance.
        </p>
      </div>
    </section>
  );
}
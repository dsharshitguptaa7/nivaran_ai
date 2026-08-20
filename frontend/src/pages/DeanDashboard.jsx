import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getDeanDashboardAnalytics,
  getDeanAttentionCases,
} from "../services/deanService";
import { getCurrentUser, logoutUser } from "../services/authService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import LiveDateTime from "../components/LiveDateTime";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function DeanDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global Filters State
  const [dateRange, setDateRange] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAuthorityRole, setSelectedAuthorityRole] = useState("");

  // UI Active Sub-tabs
  const [trendTab, setTrendTab] = useState("14D");

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================
  useEffect(() => {
    loadDashboard();
  }, [
    dateRange,
    selectedSubject,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    selectedAuthorityRole,
  ]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      const now = new Date();

      if (dateRange === "7D") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.startDate = d.toISOString();
      } else if (dateRange === "30D") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.startDate = d.toISOString();
      } else if (dateRange === "90D") {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filters.startDate = d.toISOString();
      }

      if (selectedSubject) filters.subjectId = selectedSubject;
      if (selectedCategory) filters.categoryId = selectedCategory;
      if (selectedPriority) filters.priority = selectedPriority;
      if (selectedStatus) filters.status = selectedStatus;
      if (selectedAuthorityRole) filters.authorityRole = selectedAuthorityRole;

      const [currentUser, dashboardData] = await Promise.all([
        getCurrentUser().catch(() => null),
        getDeanDashboardAnalytics(filters),
      ]);

      setUser(currentUser);
      setAnalytics(dashboardData);
    } catch (err) {
      console.error("Failed to load Dean dashboard:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login?type=authority");
        return;
      }
      setError(err?.message || "Unable to load Dean institutional analytics.");
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setDateRange("ALL");
    setSelectedSubject("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setSelectedAuthorityRole("");
  }

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  function formatDateTime(date) {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(date);
    }
  }

  const kpis = analytics?.kpis || {};
  const flowStages = analytics?.flow_stages || [];
  const aiStats = analytics?.ai_analytics || {};
  const authorityWorkloads = analytics?.authority_workloads || [];
  const categoryAnalytics = analytics?.category_analytics || [];
  const subjectAnalytics = analytics?.subject_analytics || [];
  const trends = analytics?.trends || [];
  const riskMonitoring = analytics?.risk_monitoring || {};
  const recentActivities = analytics?.recent_activities || [];
  const attentionCases = analytics?.dean_attention_cases || [];
  const filtersMeta = analytics?.filters_meta || {};

  const hasActiveFilters =
    dateRange !== "ALL" ||
    selectedSubject !== "" ||
    selectedCategory !== "" ||
    selectedPriority !== "" ||
    selectedStatus !== "" ||
    selectedAuthorityRole !== "";

  const navItems = [
    { label: "Executive Dashboard", path: "/dean", icon: "⌂", active: true },
    { label: "Dean Attention Queue", href: "#attention-section", icon: "⚠", count: attentionCases.length },
    { label: "Flow Pipeline", href: "#flow-section", icon: "⇄" },
    { label: "AI Performance", href: "#ai-performance-section", icon: "🤖" },
    { label: "Authority Workload", href: "#authority-section", icon: "👥" },
    { label: "Category & Subject", href: "#category-section", icon: "📊" },
    { label: "Trends & Velocity", href: "#trends-section", icon: "📈" },
    { label: "Risk Monitoring", href: "#risk-section", icon: "🛡" },
    { label: "Recent Activities", href: "#activity-section", icon: "◷" },
  ];

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Dean R&D"}
        userRole={user?.role || "DEAN"}
        portalHome="/dean"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="DEAN EXECUTIVE PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Dean R&D"}
          userRole={user?.role || "DEAN"}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <main className="authority-main">
          {/* HEADER */}
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">CHHATRAPATI SHAHU JI MAHARAJ UNIVERSITY • EXECUTIVE OVERSIGHT</div>
              <h1>Dean Executive Command Center</h1>
              <p>Real-time university redressal intelligence, AI accuracy benchmarking, and administrative authority oversight.</p>
            </div>

            <div className="authority-header-actions">
              <LiveDateTime format="full" />
              <button
                type="button"
                className="authority-primary-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh Data"}
              </button>
            </div>
          </section>

          {/* ERROR STATE */}
          {error && (
            <ErrorState
              title="Unable to load executive analytics"
              message={error}
              onRetry={loadDashboard}
            />
          )}

          {/* GLOBAL FILTER CARD (MODULE 10) */}
          <section className="dean-filter-card">
            <div className="dean-filter-header">
              <div className="dean-filter-title">
                <span>🔍</span>
                <strong>Institutional Multi-Dimensional Filters</strong>
                {hasActiveFilters && <span className="dean-filter-active-chip">Active Filters Applied</span>}
              </div>
              {hasActiveFilters && (
                <button type="button" className="dean-filter-reset-btn" onClick={handleResetFilters}>
                  ✕ Reset All Filters
                </button>
              )}
            </div>

            <div className="dean-filter-controls-grid">
              <div className="dean-filter-control">
                <label>Date Period</label>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  <option value="ALL">All Time</option>
                  <option value="7D">Last 7 Days</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                </select>
              </div>

              <div className="dean-filter-control">
                <label>Subject / Department</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">All Subjects</option>
                  {filtersMeta.subjects?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="dean-filter-control">
                <label>Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {filtersMeta.categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="dean-filter-control">
                <label>Priority</label>
                <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  {filtersMeta.priorities?.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="dean-filter-control">
                <label>Status</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {filtersMeta.statuses?.map((s) => (
                    <option key={s} value={s}>{String(s).replaceAll("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div className="dean-filter-control">
                <label>Authority Level</label>
                <select value={selectedAuthorityRole} onChange={(e) => setSelectedAuthorityRole(e.target.value)}>
                  <option value="">All Authority Roles</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ASSISTANT_DEAN">Assistant Dean</option>
                  <option value="ASSOCIATE_DEAN">Associate Dean</option>
                  <option value="DEAN">Dean</option>
                </select>
              </div>
            </div>
          </section>

          {/* 1. EXECUTIVE OVERVIEW KPIS (MODULE 1) */}
          <section className="authority-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <StatCard
              icon="▤"
              title="Total Received"
              value={kpis.total_grievances || 0}
              subtitle="Institution-wide intake"
              variant="default"
            />
            <StatCard
              icon="◉"
              title="Active / Open"
              value={kpis.active_grievances || 0}
              subtitle="Under active redressal"
              variant="orange"
            />
            <StatCard
              icon="✓"
              title="Resolved & Closed"
              value={kpis.resolved_grievances || 0}
              subtitle={`${kpis.closed_grievances || 0} formally closed`}
              variant="green"
            />
            <StatCard
              icon="▲"
              title="Escalated Cases"
              value={kpis.escalated_cases || 0}
              subtitle="Higher review required"
              variant="purple"
            />
            <StatCard
              icon="%"
              title="Resolution Rate"
              value={`${kpis.resolution_rate || 0}%`}
              subtitle="Intake to closure efficiency"
              variant="green"
            />
            <StatCard
              icon="⏱"
              title="Avg Resolution Time"
              value={kpis.avg_resolution_time_hours > 24 ? `${(kpis.avg_resolution_time_hours / 24).toFixed(1)} days` : `${kpis.avg_resolution_time_hours || 0} hrs`}
              subtitle="Average redressal turnaround"
              variant="blue"
            />
            <StatCard
              icon="🤖"
              title="AI Prediction Accuracy"
              value={`${kpis.ai_prediction_accuracy || 0}%`}
              subtitle="Autonomous precision rate"
              variant="purple"
            />
            <StatCard
              icon="⚖"
              title="Pending at Dean"
              value={kpis.pending_at_dean || 0}
              subtitle={`Asst: ${kpis.pending_at_assistant_dean || 0} | Assoc: ${kpis.pending_at_associate_dean || 0}`}
              variant="maroon"
            />
          </section>

          {/* 11. "REQUIRES DEAN ATTENTION" QUEUE (MODULE 11) */}
          <section id="attention-section" className="dean-attention-section">
            <div className="dean-attention-header">
              <div className="dean-attention-header-left">
                <span className="attention-fire-icon">⚠</span>
                <div>
                  <h2>Requires Dean Attention</h2>
                  <p>Actionable queue of institutional escalations, high-priority stalls, and overdue SLA breaches requiring Dean decision.</p>
                </div>
              </div>
              <span className="dean-attention-badge">
                {attentionCases.length} {attentionCases.length === 1 ? "Case Urgent" : "Cases Urgent"}
              </span>
            </div>

            {attentionCases.length === 0 ? (
              <div className="dean-attention-empty">
                <span>✓</span>
                <strong>No urgent escalations pending Dean decision.</strong>
                <p>All institutional grievances are actively progressing within target SLAs.</p>
              </div>
            ) : (
              <div className="dean-attention-grid">
                {attentionCases.map((item) => (
                  <div key={item.id} className="dean-attention-card">
                    <div className="dean-attention-card-top">
                      <div className="dean-attention-meta-left">
                        <span className="table-id-chip">{item.grievance_id}</span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <span className="dean-aging-badge">⏱ {item.aging_days}d pending</span>
                    </div>

                    <div className="dean-urgency-reason-banner">⚡ {item.urgency_reason}</div>
                    <h3>{item.title}</h3>
                    <p className="dean-attention-desc">{item.description}</p>

                    <div className="dean-attention-details-row">
                      <div><span>Subject:</span><strong>{item.subject_name || "-"}</strong></div>
                      <div><span>Category:</span><strong>{item.category_name || "-"}</strong></div>
                      <div><span>Referred By:</span><strong>{item.referred_by_name || "Officer"}</strong></div>
                    </div>

                    <div className="dean-attention-card-actions">
                      <StatusBadge status={item.status} />
                      <Link to={`/dean/grievances/${item.grievance_id}`} className="authority-primary-button">
                        Review & Decide →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. GRIEVANCE FLOW ANALYTICS (MODULE 2) */}
          <section id="flow-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>Grievance Flow & Pipeline Funnel</h2>
                <p>Stage-by-stage progression: Applicant → Manager → Assistant Dean → Associate Dean → Dean → Redressal.</p>
              </div>
            </div>

            <div className="dean-flow-pipeline" style={{ padding: "16px 20px" }}>
              {flowStages.map((stage, idx) => (
                <div key={stage.stage_key} className="dean-flow-node">
                  <div className="dean-flow-node-header">
                    <span className="flow-step-num">{stage.order}</span>
                    <strong>{stage.stage_name}</strong>
                  </div>

                  <div className="dean-flow-node-body">
                    <div className="flow-metric"><span>Total Handled</span><strong>{stage.total_handled}</strong></div>
                    <div className="flow-metric highlight">
                      <span>Currently Pending</span>
                      <strong style={{ color: stage.current_pending > 0 ? "#b91c1c" : "#059669" }}>
                        {stage.current_pending}
                      </strong>
                    </div>
                    {stage.escalated_out > 0 && (
                      <div className="flow-metric escalated">
                        <span>Escalated Out</span>
                        <strong style={{ color: "#7c3aed" }}>▲ {stage.escalated_out}</strong>
                      </div>
                    )}
                    <div className="flow-metric-dwell"><span>Avg Dwell:</span> {stage.avg_dwell_hours}h</div>
                  </div>
                  {idx < flowStages.length - 1 && <div className="dean-flow-arrow">→</div>}
                </div>
              ))}
            </div>
          </section>

          {/* 3. AI PERFORMANCE ANALYTICS (MODULE 3) */}
          <section id="ai-performance-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>AI Performance & Autonomous Classification</h2>
                <p>Model accuracy benchmarking, manager override audits, and low-confidence prediction tracking.</p>
              </div>
              <div className="ai-active-indicator">• AI Active</div>
            </div>

            <div style={{ padding: "20px" }}>
              <div className="dean-ai-stats-grid">
                <div className="ai-kpi-card">
                  <span>Total AI Predictions</span>
                  <strong>{aiStats.total_predictions || 0}</strong>
                  <small>Classified by AI Pipeline</small>
                </div>
                <div className="ai-kpi-card success">
                  <span>Correct / Accepted</span>
                  <strong style={{ color: "#059669" }}>{aiStats.correct_predictions || 0}</strong>
                  <small>Validated without override</small>
                </div>
                <div className="ai-kpi-card warning">
                  <span>Manager Overrides</span>
                  <strong style={{ color: "#d97706" }}>{aiStats.overridden_predictions || 0}</strong>
                  <small>Category adjusted by Manager</small>
                </div>
                <div className="ai-kpi-card purple">
                  <span>AI Accuracy Rate</span>
                  <strong style={{ color: "#7c3aed" }}>{aiStats.ai_accuracy_percentage || 0}%</strong>
                  <small>Overall precision rate</small>
                </div>
                <div className="ai-kpi-card">
                  <span>Low Confidence Cases</span>
                  <strong>{aiStats.low_confidence_count || 0}</strong>
                  <small>Score below 70%</small>
                </div>
              </div>

              {/* Category-wise AI Accuracy Table */}
              <div className="dean-sub-table-wrapper" style={{ marginTop: "20px" }}>
                <h3 className="dean-sub-heading">Category-wise AI Model Precision</h3>
                <table className="dean-data-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Predictions</th>
                      <th>Correct</th>
                      <th>Overridden</th>
                      <th>Precision Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiStats.category_wise_accuracy?.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: "16px" }}>No category predictions recorded.</td></tr>
                    ) : (
                      aiStats.category_wise_accuracy?.map((cat) => (
                        <tr key={cat.category_name}>
                          <td><strong>{cat.category_name}</strong></td>
                          <td>{cat.total_predictions}</td>
                          <td style={{ color: "#059669", fontWeight: 700 }}>{cat.correct_predictions}</td>
                          <td style={{ color: "#d97706", fontWeight: 700 }}>{cat.overridden_predictions}</td>
                          <td>
                            <div className="dean-pct-bar-wrapper">
                              <div
                                className="dean-pct-bar"
                                style={{
                                  width: `${cat.accuracy_percentage}%`,
                                  background: cat.accuracy_percentage >= 80 ? "#10b981" : (cat.accuracy_percentage >= 60 ? "#f59e0b" : "#ef4444"),
                                }}
                              />
                              <span>{cat.accuracy_percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 4. AUTHORITY PERFORMANCE & WORKLOAD MATRIX (MODULE 4) */}
          <section id="authority-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>Authority Performance & Workload Matrix</h2>
                <p>Workload distribution, pending bottlenecks, resolution volumes, and turnaround time per officer.</p>
              </div>
            </div>

            <div className="dean-sub-table-wrapper" style={{ padding: "0" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Authority Name</th>
                    <th>Role</th>
                    <th>Department / Subject</th>
                    <th>Assigned</th>
                    <th>Pending</th>
                    <th>Resolved</th>
                    <th>Avg Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {authorityWorkloads.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: "center", padding: "16px" }}>No authority records found.</td></tr>
                  ) : (
                    authorityWorkloads.map((auth) => (
                      <tr key={auth.user_id || auth.name}>
                        <td><strong>{auth.name}</strong></td>
                        <td><span className={`authority-role-pill ${auth.role?.toLowerCase()}`}>{String(auth.role).replaceAll("_", " ")}</span></td>
                        <td>{auth.department_or_subject || "Academic"}</td>
                        <td><strong>{auth.assigned_count}</strong></td>
                        <td>
                          <span className={auth.pending_count > 3 ? "pending-count-high" : "pending-count-normal"}>
                            {auth.pending_count}
                          </span>
                        </td>
                        <td style={{ color: "#059669", fontWeight: 700 }}>{auth.resolved_count}</td>
                        <td>{auth.avg_resolution_hours > 24 ? `${(auth.avg_resolution_hours / 24).toFixed(1)} days` : `${auth.avg_resolution_hours} hrs`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5 & 6. CATEGORY & SUBJECT ANALYTICS (MODULE 5 & 6) */}
          <div className="detail-top-grid" style={{ marginBottom: "24px" }}>
            <section id="category-section" className="authority-content-card">
              <div className="authority-card-header">
                <div>
                  <h2>Category-Wise Distribution</h2>
                  <p>Volume, percentage share, and escalation concentration.</p>
                </div>
              </div>
              <div className="oversight-list" style={{ padding: "16px 20px" }}>
                {categoryAnalytics.map((cat) => (
                  <div key={cat.category_name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <strong>{cat.category_name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {cat.count} cases ({cat.percentage}%) {cat.escalated_count > 0 && <span style={{ color: "#dc2626" }}>• {cat.escalated_count} escalated</span>}
                      </div>
                    </div>
                    <strong>{cat.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="authority-content-card">
              <div className="authority-card-header">
                <div>
                  <h2>Subject & Department Breakdown</h2>
                  <p>Designated Assistant Deans and case breakdown.</p>
                </div>
              </div>
              <div className="oversight-list" style={{ padding: "16px 20px" }}>
                {subjectAnalytics.slice(0, 6).map((sub) => (
                  <div key={sub.subject_id || sub.subject_name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <strong>{sub.subject_name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Officer: {sub.assistant_dean_name || "Assistant Dean"} • Cluster: {sub.cluster_name}
                      </div>
                    </div>
                    <strong>{sub.total_grievances}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 7. TREND VELOCITY & RISK MONITORING (MODULE 7 & 8) */}
          <section id="trends-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>14-Day Velocity & Intake Trend</h2>
                <p>Daily progression of grievance intake vs formal resolutions.</p>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <div className="dean-trend-bars">
                {trends.map((item) => (
                  <div key={item.period} className="dean-trend-bar-col">
                    <div className="dean-trend-bars-stacked">
                      {item.submitted_count > 0 && (
                        <div className="trend-bar-submitted" style={{ height: `${Math.min(item.submitted_count * 18, 120)}px` }} title={`${item.submitted_count} Submitted`}>
                          {item.submitted_count}
                        </div>
                      )}
                      {item.resolved_count > 0 && (
                        <div className="trend-bar-resolved" style={{ height: `${Math.min(item.resolved_count * 18, 120)}px` }} title={`${item.resolved_count} Resolved`}>
                          {item.resolved_count}
                        </div>
                      )}
                    </div>
                    <span className="trend-period-label">{item.period}</span>
                  </div>
                ))}
              </div>
              <div className="dean-trend-legend">
                <div><span className="legend-dot submitted" /> Submitted Intake</div>
                <div><span className="legend-dot resolved" /> Redressed / Resolved</div>
              </div>
            </div>
          </section>

          {/* 8. RISK MONITORING (MODULE 8) */}
          <section id="risk-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>Institutional Risk & SLA Monitoring</h2>
                <p>High-priority unresolved cases, SLA breach alerts, and aging pending grievances.</p>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <div className="dean-risk-cards-grid">
                <div className="risk-metric-card danger">
                  <span className="risk-metric-title">High Priority Unresolved</span>
                  <strong className="risk-metric-val">{riskMonitoring.high_priority_unresolved_count || 0}</strong>
                  <p>Immediate executive oversight</p>
                </div>
                <div className="risk-metric-card warning">
                  <span className="risk-metric-title">Aging Cases (&gt; 7 Days)</span>
                  <strong className="risk-metric-val">{riskMonitoring.aging_pending_count || 0}</strong>
                  <p>Exceeded turnaround target</p>
                </div>
                <div className="risk-metric-card alert">
                  <span className="risk-metric-title">SLA-Risk Grievances</span>
                  <strong className="risk-metric-val">{riskMonitoring.sla_risk_count || 0}</strong>
                  <p>Approaching deadline threshold</p>
                </div>
                <div className="risk-metric-card purple">
                  <span className="risk-metric-title">Repeatedly Escalated</span>
                  <strong className="risk-metric-val">{riskMonitoring.frequently_escalated_count || 0}</strong>
                  <p>Multiple escalation tiers</p>
                </div>
              </div>
            </div>
          </section>

          {/* 9. RECENT ACTIVITY FEED (MODULE 9) */}
          <section id="activity-section" className="authority-content-card" style={{ marginBottom: "24px" }}>
            <div className="authority-card-header">
              <div>
                <h2>Recent Institutional Activity Stream</h2>
                <p>Audit trail of grievance state transitions and officer actions across CSJMU.</p>
              </div>
            </div>
            <div className="dean-activity-timeline" style={{ border: "none", boxShadow: "none" }}>
              {recentActivities.map((act) => (
                <div key={act.id} className="dean-activity-item">
                  <div className="dean-activity-marker">●</div>
                  <div className="dean-activity-content">
                    <div className="dean-activity-top">
                      <strong>{act.description}</strong>
                      <span>{formatDateTime(act.timestamp)}</span>
                    </div>
                    <div className="dean-activity-meta">
                      <span className="table-id-chip">{act.grievance_id}</span>
                      <span>{act.grievance_title}</span>
                      <span>• By {act.actor_name} ({String(act.actor_role).replaceAll("_", " ")})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default DeanDashboard;
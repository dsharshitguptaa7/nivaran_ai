import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getGrievance,
  getGrievanceHistory,
  reviewAIRecommendation,
  closeGrievance,
  reopenGrievance,
} from "../services/grievanceService";
import {
  uploadDocument,
  downloadDocument,
} from "../services/documentService";
import { apiRequest } from "../services/api";
import { getCurrentUser, logoutUser } from "../services/authService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import AIAnalysisCard from "../components/AIAnalysisCard";
import ApplicantInfoCard from "../components/ApplicantInfoCard";
import DocumentRequestsSection from "../components/DocumentRequestsSection";
import RequestDocumentModal from "../components/RequestDocumentModal";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function ManagerGrievanceDetail() {
  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review & Forward State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [remarks, setRemarks] = useState("");

  // Closure & Reopen Modals
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closureRemarks, setClosureRemarks] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState("");

  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [reopenError, setReopenError] = useState("");

  // Document State
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // =====================================================
  // LOAD GRIEVANCE
  // =====================================================
  useEffect(() => {
    loadGrievance();
    loadCategories();
  }, [grievanceId]);

  async function loadGrievance() {
    try {
      setLoading(true);
      setError("");

      const [currentUser, grievanceData, historyData] = await Promise.all([
        getCurrentUser().catch(() => null),
        getGrievance(grievanceId),
        getGrievanceHistory(grievanceId).catch(() => []),
      ]);

      setUser(currentUser);
      setGrievance(grievanceData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      if (grievanceData?.category?.id) {
        setSelectedCategory(grievanceData.category.id);
      }
    } catch (err) {
      console.error("Manager load grievance error:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login?type=authority");
        return;
      }
      setError(err?.message || "Unable to load grievance.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  // =====================================================
  // CATEGORY REVIEW ACTIONS
  // =====================================================
  async function handleAcceptCategory() {
    try {
      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      if (grievance.category_reviewed) {
        setReviewMessage("AI category has already been validated and confirmed.");
        return;
      }

      const targetCatId =
        grievance.category?.id ||
        grievance.ai_processing?.predicted_category_id ||
        (categories.find(
          (c) =>
            c.name?.toLowerCase() ===
            (grievance.category?.name || grievance.category)?.toLowerCase()
        )?.id);

      if (!targetCatId) {
        setReviewError("Category ID could not be identified.");
        return;
      }

      const response = await reviewAIRecommendation(
        grievance.grievance_id,
        targetCatId,
        "CONFIRMED"
      );

      const refreshed = await getGrievance(grievance.grievance_id);
      setGrievance(refreshed || response);
      setReviewMessage(`AI predicted category confirmed successfully.`);
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Accept category error:", err);
      if (err.message?.includes("already been reviewed")) {
        const refreshed = await getGrievance(grievance.grievance_id);
        if (refreshed) setGrievance(refreshed);
        setReviewMessage("AI category has already been confirmed.");
      } else {
        setReviewError(err?.message || "Unable to accept category.");
      }
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleOverrideCategory() {
    if (!selectedCategory) {
      setReviewError("Please select a category to override.");
      return;
    }

    try {
      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      const response = await reviewAIRecommendation(
        grievance.grievance_id,
        selectedCategory,
        "OVERRIDDEN"
      );

      const refreshed = await getGrievance(grievance.grievance_id);
      setGrievance(refreshed || response);
      setReviewMessage("Category overridden successfully.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Override category error:", err);
      setReviewError(err?.message || "Unable to override category.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleForwardGrievance(e) {
    if (e) e.preventDefault();

    try {
      setActionLoading(true);
      setActionError("");
      setActionMessage("");

      const targetAssigneeId = grievance.routing?.next_authority_id || undefined;

      await apiRequest(`/assignments/${grievance.grievance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to: targetAssigneeId,
          remarks: remarks.trim() || undefined,
        }),
      });

      const updatedGrievance = await getGrievance(grievance.grievance_id);
      setGrievance(updatedGrievance);
      setRemarks("");
      const targetName = updatedGrievance.routing?.assigned_to_name || updatedGrievance.routing?.next_authority_name || grievance.routing?.next_authority_name || grievance.next_authority_name || "Designated Authority";
      const targetRole = (updatedGrievance.routing?.assigned_to_role || updatedGrievance.routing?.next_authority_role || grievance.routing?.next_authority_role || grievance.next_authority_role || "Assistant Dean").replaceAll("_", " ");
      setActionMessage(`Grievance successfully forwarded to ${targetName} (${targetRole}).`);
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Forward grievance error:", err);
      setActionError(err?.message || "Unable to forward grievance.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseGrievance(e) {
    if (e) e.preventDefault();
    try {
      setCloseLoading(true);
      setCloseError("");

      const response = await closeGrievance(
        grievance.grievance_id,
        closureRemarks.trim() || "Resolution verified and case formally closed by Central Redressal Manager."
      );

      setGrievance(response);
      setCloseModalOpen(false);
      setClosureRemarks("");
      setActionMessage("Grievance has been formally verified and closed.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Close grievance error:", err);
      setCloseError(err?.message || "Failed to close grievance.");
    } finally {
      setCloseLoading(false);
    }
  }

  async function handleReopenGrievance(e) {
    if (e) e.preventDefault();
    if (!reopenReason.trim()) {
      setReopenError("Please enter a reason for reopening.");
      return;
    }

    try {
      setReopenLoading(true);
      setReopenError("");

      const response = await reopenGrievance(grievance.grievance_id, reopenReason.trim());
      setGrievance(response);
      setReopenModalOpen(false);
      setReopenReason("");
      setActionMessage("Grievance reopened and returned to active pipeline.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Reopen grievance error:", err);
      setReopenError(err?.message || "Failed to reopen grievance.");
    } finally {
      setReopenLoading(false);
    }
  }

  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !grievance) return;

    if (file.size > 20 * 1024 * 1024) {
      setDocError(`File "${file.name}" exceeds 20MB limit.`);
      return;
    }

    try {
      setDocUploading(true);
      setDocError("");
      setDocMessage("");

      await uploadDocument(grievance.grievance_id, file, "OFFICIAL_ORDER");
      setDocMessage(`Document "${file.name}" uploaded successfully.`);
      const updatedGrievance = await getGrievance(grievance.grievance_id);
      setGrievance(updatedGrievance);
    } catch (err) {
      console.error("Document upload error:", err);
      setDocError(err?.message || "Failed to upload document.");
    } finally {
      setDocUploading(false);
      e.target.value = "";
    }
  }

  async function handleDocumentDownload(doc) {
    try {
      await downloadDocument(doc.id, doc.file_name);
    } catch (err) {
      console.error("Download error:", err);
      alert(err?.message || "Failed to download document.");
    }
  }

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  function formatStatus(status) {
    if (!status) return "-";
    return String(status).replaceAll("_", " ");
  }

  function formatDate(date) {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  }

  function formatDateTime(date) {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(date);
    }
  }

  function getCategoryName(g) {
    if (!g) return "Not classified";
    if (g.final_category && typeof g.final_category === "object") return g.final_category.name || "General";
    if (g.category && typeof g.category === "object") return g.category.name || "General";
    if (typeof g.category === "string") return g.category;
    return "Not classified";
  }

  function getClusterName(g) {
    if (!g) return "Academic Cluster";
    if (g.routing?.cluster_name) return g.routing.cluster_name;
    if (typeof g.cluster === "string") return g.cluster;
    return "Academic Affairs";
  }

  function getDepartmentName(g) {
    if (!g) return "-";
    if (g.routing?.subject_name) return g.routing.subject_name;
    if (typeof g.department === "string") return g.department;
    return "University Department";
  }

  function getApplicantName(g) {
    if (!g) return "Applicant";
    if (g.routing?.applicant_name) return g.routing.applicant_name;
    if (g.applicant && typeof g.applicant === "object") return g.applicant.full_name || g.applicant.name || "Applicant";
    if (typeof g.submitted_by === "string") return g.submitted_by;
    return "CSJMU Applicant";
  }

  const navItems = [
    { label: "Dashboard", path: "/manager", icon: "▦" },
    { label: "Grievance Detail", path: "#", icon: "▤", active: true },
  ];

  if (loading) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Manager" userRole="MANAGER" portalHome="/manager" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="MANAGER PORTAL" navItems={navItems} userName="Manager" userRole="MANAGER" onLogout={handleLogout} />
          <main className="authority-main">
            <LoadingState message="Loading grievance details..." />
          </main>
        </div>
      </div>
    );
  }

  if (error && !grievance) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Manager" userRole="MANAGER" portalHome="/manager" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="MANAGER PORTAL" navItems={navItems} userName="Manager" userRole="MANAGER" onLogout={handleLogout} />
          <main className="authority-main">
            <ErrorState title="Unable to load grievance" message={error} backLink="/manager" backText="← Back to Dashboard" />
          </main>
        </div>
      </div>
    );
  }

  if (!grievance) return null;

  const categoryName = getCategoryName(grievance);
  const clusterName = getClusterName(grievance);
  const departmentName = getDepartmentName(grievance);
  const applicantName = getApplicantName(grievance);
  const timelineItems = history.length > 0 ? history : (grievance.timeline || []);

  const isPendingReview = grievance.status === "PENDING_REVIEW";
  const isResolved = grievance.status === "RESOLVED";
  const isClosed = grievance.status === "CLOSED";

  return (
    <div className="authority-page">
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Manager"}
        userRole={user?.role || "MANAGER"}
        portalHome="/manager"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        <AuthoritySidebar
          portalLabel="MANAGER PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Manager"}
          userRole={user?.role || "MANAGER"}
          onLogout={handleLogout}
        />

        <main className="authority-main">
          {/* BREADCRUMB */}
          <Link to="/manager" className="detail-back-link">
            ← Back to Manager Dashboard
          </Link>

          {/* PAGE HEADER */}
          <header className="detail-page-header">
            <div>
              <span className="table-id-chip">{grievance.grievance_id}</span>
              <h1>{grievance.title}</h1>
              <p>Submitted on {formatDate(grievance.submitted_at)} ({formatDateTime(grievance.submitted_at)})</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {!isClosed && !isResolved && (
                <button
                  type="button"
                  className="authority-btn-secondary"
                  onClick={() => setIsDocModalOpen(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  📄 Request Additional Documents
                </button>
              )}
              <StatusBadge status={grievance.status} />
            </div>
          </header>

          {/* NOTIFICATION MESSAGES */}
          {reviewMessage && <div className="authority-doc-success-msg" style={{ marginBottom: "16px" }}>✓ {reviewMessage}</div>}
          {reviewError && <div className="dashboard-error" style={{ marginBottom: "16px" }}><span>!</span><p>{reviewError}</p></div>}
          {actionMessage && <div className="authority-doc-success-msg" style={{ marginBottom: "16px" }}>✓ {actionMessage}</div>}
          {actionError && <div className="dashboard-error" style={{ marginBottom: "16px" }}><span>!</span><p>{actionError}</p></div>}

          {/* TOP 2-COLUMN GRID: GRIEVANCE DETAILS + APPLICANT INFORMATION */}
          <div className="detail-top-grid">
            <section className="detail-card">
              <div className="detail-card-header">
                <h2>Grievance Details</h2>
              </div>

              <div className="detail-card-body">
                <div className="detail-field">
                  <span>TITLE</span>
                  <strong>{grievance.title}</strong>
                </div>

                <div className="detail-field">
                  <span>DESCRIPTION</span>
                  <p>{grievance.description}</p>
                </div>

                <div className="detail-meta-grid">
                  <div className="detail-field">
                    <span>CATEGORY</span>
                    <strong>{categoryName}</strong>
                  </div>

                  <div className="detail-field">
                    <span>CLUSTER</span>
                    <strong>{clusterName}</strong>
                  </div>

                  <div className="detail-field">
                    <span>PRIORITY</span>
                    <div><PriorityBadge priority={grievance.priority} /></div>
                  </div>

                  <div className="detail-field">
                    <span>CURRENT ASSIGNEE</span>
                    <strong>{grievance.routing?.assigned_to_name || "Central Manager"}</strong>
                  </div>
                </div>
              </div>
            </section>

            <ApplicantInfoCard
              applicant={
                grievance.applicant || {
                  full_name: applicantName,
                  department: departmentName,
                  subject_name: grievance.subject_name || "General",
                }
              }
            />
          </div>

          {/* AI AUTONOMOUS ANALYSIS CARD */}
          <div style={{ marginTop: "24px" }}>
            <AIAnalysisCard
              predictedCategory={grievance.category?.name || "Not classified"}
              finalCategory={grievance.final_category?.name}
              clusterName={clusterName}
              confidenceScore={grievance.ai_confidence}
              isOverridden={grievance.category_overridden}
            />
          </div>

          {/* REQUESTED SUPPORTING DOCUMENTS SECTION */}
          {grievance.document_requests && grievance.document_requests.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <DocumentRequestsSection
                documentRequests={grievance.document_requests}
                grievanceId={grievance.grievance_id || grievance.id}
                isApplicant={false}
                onRefresh={loadGrievance}
              />
            </div>
          )}

          {/* MANAGER AI CATEGORY REVIEW ACTIONS */}
          {isPendingReview && (
            <section className="detail-card authority-decision-card">
              <div className="detail-card-header">
                <div>
                  <h2>Manager AI Validation & Classification Review</h2>
                  <p>
                    {grievance.category_reviewed
                      ? "AI category has been validated. You can forward to the designated authority or change category override."
                      : "Accept the AI predicted category or select an alternative override before forwarding."}
                  </p>
                </div>
                {grievance.category_reviewed ? (
                  <span className="decision-required-badge" style={{ background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }}>
                    ✓ CATEGORY VALIDATED
                  </span>
                ) : (
                  <span className="decision-required-badge">VALIDATION REQUIRED</span>
                )}
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                {grievance.category_reviewed ? (
                  <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "600" }}>
                    <span>✓</span>
                    <span>Category Confirmed: <strong>{grievance.final_category?.name || grievance.category?.name || "Confirmed"}</strong></span>
                    {grievance.category_overridden && <span style={{ fontSize: "12px", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "4px", marginLeft: "auto" }}>Manager Overridden</span>}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "20px" }}>
                    <button
                      type="button"
                      className="authority-primary-button"
                      onClick={handleAcceptCategory}
                      disabled={reviewLoading}
                    >
                      {reviewLoading ? "Accepting..." : `✓ Accept AI Category: "${grievance.category?.name || 'Current'}"`}
                    </button>
                  </div>
                )}

                {/* OVERRIDE DROPDOWN FORM */}
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                  <div className="form-group" style={{ flex: 1, minWidth: "220px", marginBottom: 0 }}>
                    <label htmlFor="override-category-select">Or Override Category:</label>
                    <select
                      id="override-category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={reviewLoading}
                    >
                      <option value="">Select Alternative Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleOverrideCategory}
                    disabled={reviewLoading || !selectedCategory}
                  >
                    {reviewLoading ? "Applying..." : "Apply Category Override"}
                  </button>
                </div>

                {/* FORWARD SECTION */}
                <form onSubmit={handleForwardGrievance} style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                  {(() => {
                    const nextTargetName = grievance.routing?.next_authority_name || grievance.next_authority_name;
                    const nextTargetRole = (grievance.routing?.next_authority_role || grievance.next_authority_role || "Assistant Dean").replaceAll("_", " ");
                    const labelRoleText = nextTargetName ? `${nextTargetRole} (${nextTargetName})` : nextTargetRole;

                    return (
                      <>
                        <div className="form-group">
                          <label htmlFor="forward-remarks">Forwarding Remarks to {labelRoleText} (Optional)</label>
                          <textarea
                            id="forward-remarks"
                            rows={2}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder={`Add administrative routing instructions for ${labelRoleText}...`}
                            disabled={actionLoading}
                          />
                        </div>

                        <button
                          type="submit"
                          className="authority-primary-button"
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Forwarding..." : `Forward to ${labelRoleText} →`}
                        </button>
                      </>
                    );
                  })()}
                </form>
              </div>
            </section>
          )}

          {/* POST-RESOLUTION REVIEW PIPELINE CARD (MANAGER AUTHORITY) */}
          {isResolved && (
            <section className="detail-card authority-decision-card" style={{ border: "2px solid #10b981", background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)" }}>
              <div className="detail-card-header">
                <div>
                  <h2 style={{ color: "#047857" }}>Post-Resolution Review Pipeline</h2>
                  <p>Authority has resolved this grievance. Review resolution details and choose to formally close or return/reopen.</p>
                </div>
                <span className="decision-required-badge" style={{ background: "#059669" }}>CLOSURE REVIEW</span>
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="authority-resolution-notes-box" style={{ marginBottom: "18px" }}>
                  <strong>Authority Resolution Notes:</strong>
                  <p style={{ marginTop: "6px", color: "#1e293b" }}>{grievance.resolution_notes || "Formal redressal completed."}</p>
                  <small style={{ color: "#64748b" }}>Resolved by: {grievance.resolved_by_name || "Authority"} on {formatDateTime(grievance.resolved_at)}</small>
                </div>

                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="authority-primary-button"
                    style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", border: "1px solid #059669" }}
                    onClick={() => {
                      setCloseModalOpen(true);
                      setCloseError("");
                    }}
                  >
                    🔒 Approve & Formally Close Grievance
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                    onClick={() => {
                      setReopenModalOpen(true);
                      setReopenError("");
                    }}
                  >
                    ↻ Reopen / Request Additional Action
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* FORMALLY CLOSED SUMMARY */}
          {isClosed && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div>
                  <h2>Case Concluded & Formally Closed</h2>
                  <span>Archived Record</span>
                </div>
                <StatusBadge status="CLOSED" />
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="detail-field full">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>CLOSURE REMARKS</span>
                  <div className="authority-resolution-notes-box" style={{ marginTop: "6px" }}>
                    {grievance.closure_remarks || "Formally verified and closed by Central Manager."}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>CLOSED BY</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {grievance.closed_by_name || "Manager"}
                    </strong>
                  </div>

                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>CLOSED AT</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {formatDateTime(grievance.closed_at)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ATTACHED DOCUMENTS */}
          <section className="detail-card authority-documents-card">
            <div className="detail-card-header">
              <div>
                <h2>Attached Documents & Official Orders</h2>
                <p>Applicant submissions, official orders, and verification files.</p>
              </div>

              <div>
                <input
                  id="mgr-doc-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleDocumentUpload}
                  disabled={docUploading}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="mgr-doc-upload"
                  className="authority-doc-upload-btn"
                  style={{ cursor: docUploading ? "not-allowed" : "pointer" }}
                >
                  {docUploading ? "Uploading..." : "+ Upload Document"}
                </label>
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {docMessage && <div className="authority-doc-success-msg">✓ {docMessage}</div>}
              {docError && <div className="authority-form-error"><span>!</span><p>{docError}</p></div>}

              <div className="authority-documents-list">
                {(!grievance.documents || grievance.documents.length === 0) ? (
                  <div className="authority-doc-empty">No documents attached to this grievance.</div>
                ) : (
                  grievance.documents.map((doc) => (
                    <div key={doc.id} className="authority-doc-card">
                      <div className="authority-doc-card-info">
                        <span className="authority-doc-icon">{doc.file_name.endsWith(".pdf") ? "📄" : "📎"}</span>
                        <div>
                          <strong className="authority-doc-name">{doc.file_name}</strong>
                          <div className="authority-doc-meta">
                            <span className="applicant-doc-type-badge">{doc.document_type || "ATTACHMENT"}</span>
                            <span>•</span>
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            {doc.uploader_name && <span>• by {doc.uploader_name}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="authority-doc-download-btn"
                        onClick={() => handleDocumentDownload(doc)}
                        title="Download file"
                      >
                        Download ⬇
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* TIMELINE / HISTORY */}
          <section className="detail-card timeline-card">
            <div className="detail-card-header">
              <h2>Grievance Timeline & Audit History</h2>
              <span>{timelineItems.length} events</span>
            </div>

            <div className="timeline-body">
              {timelineItems.length === 0 ? (
                <div style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>No timeline events recorded.</div>
              ) : (
                timelineItems.map((event, index) => (
                  <div className="timeline-item" key={event.id || index}>
                    <div className="timeline-marker">✓</div>
                    <div className="timeline-content">
                      <strong>{formatStatus(event.new_status || event.status)}</strong>
                      <p>{event.reason || event.description || "Status updated"}</p>
                      <span>{formatDateTime(event.created_at || event.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      {/* CLOSE GRIEVANCE MODAL */}
      {closeModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Approve & Formally Close Grievance</h2>
                <span className="table-id-chip">{grievance.grievance_id}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCloseModalOpen(false)}
                disabled={closeLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseGrievance}>
              <div className="modal-body">
                {closeError && (
                  <div className="dashboard-error" style={{ marginBottom: "16px" }}>
                    <span>!</span>
                    <p>{closeError}</p>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="modal-closure-remarks">Formal Closure Remarks & Verification Summary</label>
                  <textarea
                    id="modal-closure-remarks"
                    rows={4}
                    value={closureRemarks}
                    onChange={(e) => setClosureRemarks(e.target.value)}
                    placeholder="Enter formal closure remarks confirming satisfactory redressal..."
                    disabled={closeLoading}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCloseModalOpen(false)}
                  disabled={closeLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="authority-primary-button"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", border: "1px solid #059669" }}
                  disabled={closeLoading}
                >
                  {closeLoading ? "Closing Case..." : "Confirm & Close Grievance →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN GRIEVANCE MODAL */}
      {reopenModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Reopen / Return Grievance</h2>
                <span className="table-id-chip">{grievance.grievance_id}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setReopenModalOpen(false)}
                disabled={reopenLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReopenGrievance}>
              <div className="modal-body">
                {reopenError && (
                  <div className="dashboard-error" style={{ marginBottom: "16px" }}>
                    <span>!</span>
                    <p>{reopenError}</p>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="modal-reopen-reason">Reason for Reopening & Required Clarification *</label>
                  <textarea
                    id="modal-reopen-reason"
                    rows={4}
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Specify what additional actions or documentation are needed..."
                    disabled={reopenLoading}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setReopenModalOpen(false)}
                  disabled={reopenLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="authority-danger-button"
                  disabled={reopenLoading || !reopenReason.trim()}
                >
                  {reopenLoading ? "Reopening..." : "Confirm Reopening →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST ADDITIONAL DOCUMENTS MODAL */}
      <RequestDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        grievanceId={grievance.grievance_id || grievance.id}
        onSuccess={loadGrievance}
      />
    </div>
  );
}

export default ManagerGrievanceDetail;
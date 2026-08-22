import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Folder,
  Layers,
  GitBranch,
  User,
  Paperclip,
  Upload,
  Download,
  History,
  CheckCircle2,
  Scale,
  AlertCircle,
  Check,
  RotateCcw,
  Send,
  Lock,
  FilePlus,
  FolderOpen,
  LayoutDashboard,
} from "lucide-react";

import {
  getGrievance,
  getGrievanceHistory,
  reviewAIRecommendation,
  processGrievanceAI,
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

  // Document Management State
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // =====================================================
  // LOAD GRIEVANCE & MASTER DATA
  // =====================================================
  useEffect(() => {
    loadData();
  }, [grievanceId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [currentUser, grievanceData, historyData, categoriesData, subjectsData] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getGrievance(grievanceId),
          getGrievanceHistory(grievanceId).catch(() => []),
          apiRequest("/categories").catch(() => []),
          apiRequest("/subjects").catch(() => []),
        ]);

      setUser(currentUser);
      setGrievance(grievanceData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
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

  async function loadGrievance() {
    try {
      const refreshed = await getGrievance(grievanceId);
      setGrievance(refreshed);
      const updatedHistory = await getGrievanceHistory(grievanceId).catch(() => []);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Refresh grievance error:", err);
    }
  }

  // =====================================================
  // ACTIONS
  // =====================================================
  async function handleAcceptCategory() {
    if (!grievance) return;
    try {
      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      const targetCatId =
        grievance.category_id ||
        grievance.category?.id ||
        grievance.ai_processing?.predicted_category_id ||
        grievance.final_category_id;

      const response = await reviewAIRecommendation(
        grievance.grievance_id,
        targetCatId,
        "CONFIRMED"
      );

      const refreshed = await getGrievance(grievance.grievance_id);
      setGrievance(refreshed || response);
      setReviewMessage("AI Predicted Category accepted and verified.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Accept category error:", err);
      setReviewError(err?.message || "Unable to accept category.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleOverrideCategory() {
    if (!grievance || !selectedCategory) return;
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

  async function handleTriggerAIAnalysis() {
    if (!grievance) return;
    try {
      setReviewLoading(true);
      setReviewError("");
      setReviewMessage("");

      await processGrievanceAI(grievance.grievance_id || grievance.id);
      const refreshed = await getGrievance(grievance.grievance_id || grievance.id);
      setGrievance(refreshed);
      setReviewMessage("AI Analysis completed successfully.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id || grievance.id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Trigger AI error:", err);
      setReviewError(err?.message || "Failed to trigger AI analysis.");
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
      setReopenError("Please enter a reason for reopening the grievance.");
      return;
    }

    try {
      setReopenLoading(true);
      setReopenError("");

      const response = await reopenGrievance(
        grievance.grievance_id,
        reopenReason.trim()
      );

      setGrievance(response);
      setReopenModalOpen(false);
      setReopenReason("");
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
    { label: "Dashboard", path: "/manager", icon: <LayoutDashboard size={16} /> },
    { label: "Grievance Detail", path: "#", icon: <FileText size={16} />, active: true },
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

  const isPendingReview = ["PENDING_REVIEW", "SUBMITTED", "AI_PROCESSING"].includes(grievance.status);
  const isResolved = grievance.status === "RESOLVED";
  const isClosed = grievance.status === "CLOSED";
  const canValidateCategory = !isResolved && !isClosed;

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
          {/* COMPACT BREADCRUMB */}
          <div className="detail-navigation-bar">
            <Link to="/manager" className="detail-back-link">
              <ArrowLeft size={15} />
              <span>Back to Manager Dashboard</span>
            </Link>
          </div>

          {/* CASE HEADER */}
          <header className="detail-page-header">
            <div className="detail-header-main">
              <div className="detail-header-meta-row">
                <span className="table-id-chip font-mono">{grievance.grievance_id}</span>
                <span className="meta-divider">•</span>
                <div className="detail-header-timestamp">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Submitted {formatDate(grievance.submitted_at)}</span>
                </div>
                {grievance.updated_at && (
                  <>
                    <span className="meta-divider">•</span>
                    <div className="detail-header-timestamp">
                      <Clock size={13} className="text-slate-400" />
                      <span>Updated {formatDateTime(grievance.updated_at)}</span>
                    </div>
                  </>
                )}
              </div>
              <h1 className="detail-case-title">{grievance.title}</h1>
            </div>

            <div className="detail-header-actions-wrap">
              {!isClosed && !isResolved && (
                <button
                  type="button"
                  className="authority-btn-secondary"
                  onClick={() => setIsDocModalOpen(true)}
                >
                  <FilePlus size={14} />
                  <span>Request Documents</span>
                </button>
              )}
              <StatusBadge status={grievance.status} />
            </div>
          </header>

          {/* NOTIFICATION MESSAGES */}
          {reviewMessage && (
            <div className="authority-doc-success-msg">
              <CheckCircle2 size={16} />
              <span>{reviewMessage}</span>
            </div>
          )}
          {reviewError && (
            <div className="dashboard-error">
              <AlertCircle size={16} />
              <p>{reviewError}</p>
            </div>
          )}
          {actionMessage && (
            <div className="authority-doc-success-msg">
              <CheckCircle2 size={16} />
              <span>{actionMessage}</span>
            </div>
          )}
          {actionError && (
            <div className="dashboard-error">
              <AlertCircle size={16} />
              <p>{actionError}</p>
            </div>
          )}

          {/* TOP 2-COLUMN GRID: GRIEVANCE DETAILS + APPLICANT INFORMATION */}
          <div className="detail-top-grid">
            {/* LEFT: GRIEVANCE DETAILS */}
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <FileText size={18} className="text-slate-700" />
                  <div>
                    <h2>Grievance Details</h2>
                    <p>Core statement and administrative categorization</p>
                  </div>
                </div>
              </div>

              <div className="detail-card-body">
                <div className="detail-field">
                  <span className="detail-field-label">TITLE</span>
                  <strong className="detail-field-value text-slate-900">{grievance.title}</strong>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">DESCRIPTION</span>
                  <p className="detail-description-text">{grievance.description}</p>
                </div>

                <div className="detail-meta-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">CATEGORY</span>
                    <div className="flex-val-row">
                      <Folder size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{categoryName}</strong>
                    </div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">CLUSTER</span>
                    <div className="flex-val-row">
                      <Layers size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{clusterName}</strong>
                    </div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">PRIORITY</span>
                    <div><PriorityBadge priority={grievance.priority} /></div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">CURRENT ASSIGNEE</span>
                    <div className="flex-val-row">
                      <GitBranch size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">
                        {grievance.routing?.assigned_to_name || "Central Manager"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT: APPLICANT INFORMATION */}
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

          {/* CLASSIFICATION & CASE ROUTING SECTION */}
          <div className="detail-section-spacer">
            <AIAnalysisCard
              predictedCategory={
                grievance.category?.name ||
                grievance.ai_processing?.predicted_category?.name ||
                (grievance.final_category && !grievance.category_overridden ? grievance.final_category.name : null) ||
                "Not classified"
              }
              finalCategory={grievance.final_category?.name}
              clusterName={clusterName}
              confidenceScore={
                grievance.ai_confidence != null
                  ? grievance.ai_confidence
                  : grievance.ai_processing?.confidence_score
              }
              isOverridden={grievance.category_overridden}
            />
          </div>

          {/* REQUESTED SUPPORTING DOCUMENTS SECTION */}
          {grievance.document_requests && grievance.document_requests.length > 0 && (
            <div className="detail-section-spacer">
              <DocumentRequestsSection
                documentRequests={grievance.document_requests}
                grievanceId={grievance.grievance_id || grievance.id}
                isApplicant={false}
                onRefresh={loadGrievance}
              />
            </div>
          )}

          {/* MANAGER AI CATEGORY REVIEW & FORWARDING CARD */}
          {canValidateCategory && (
            <section className="detail-card authority-decision-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <CheckCircle2 size={18} className="text-amber-600" />
                  <div>
                    <h2>Manager Validation & Classification Review</h2>
                    <p>
                      {grievance.category_reviewed
                        ? "Category has been validated. You can forward to the designated authority or change category override."
                        : "Accept the predicted category, run AI classification, or select an alternative override before forwarding."}
                    </p>
                  </div>
                </div>
                {grievance.category_reviewed ? (
                  <span className="decision-required-badge validated">
                    <Check size={12} />
                    <span>VALIDATED</span>
                  </span>
                ) : (
                  <span className="decision-required-badge">VALIDATION REQUIRED</span>
                )}
              </div>

              <div className="detail-card-body">
                {grievance.category_reviewed ? (
                  <div className="category-confirmed-banner">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    <span>Category Confirmed: <strong>{grievance.final_category?.name || grievance.category?.name || "Confirmed"}</strong></span>
                    {grievance.category_overridden && (
                      <span className="category-overridden-chip">Manager Overridden</span>
                    )}
                  </div>
                ) : (
                  <div className="action-button-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {(grievance.category?.name || grievance.ai_processing?.predicted_category?.name) ? (
                      <button
                        type="button"
                        className="authority-primary-button"
                        onClick={handleAcceptCategory}
                        disabled={reviewLoading}
                      >
                        <Check size={14} />
                        <span>
                          {reviewLoading
                            ? "Accepting..."
                            : `Accept Category: "${grievance.category?.name || grievance.ai_processing?.predicted_category?.name}"`}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="authority-primary-button"
                        onClick={handleTriggerAIAnalysis}
                        disabled={reviewLoading}
                        style={{ backgroundColor: "#4f46e5" }}
                      >
                        <Layers size={14} />
                        <span>{reviewLoading ? "Running AI Classification..." : "Run AI Classification Now"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* OVERRIDE DROPDOWN FORM */}
                <div className="override-form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="override-category-select">Or Override Category:</label>
                    <select
                      id="override-category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={reviewLoading}
                      className="form-control"
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
                    <RotateCcw size={14} />
                    <span>{reviewLoading ? "Applying..." : "Apply Category Override"}</span>
                  </button>
                </div>

                {/* FORWARD SECTION */}
                {Boolean(grievance.routing?.can_forward && grievance.routing?.next_authority_name) && (
                  <form onSubmit={handleForwardGrievance} className="forward-form-section">
                    {(() => {
                      const nextTargetName = grievance.routing?.next_authority_name;
                      const nextTargetRole = (grievance.routing?.next_authority_role || "Subject Assistant Dean").replaceAll("_", " ");

                      return (
                        <>
                          <div className="form-group">
                            <label htmlFor="forward-remarks">
                              Forwarding Remarks to {nextTargetName} ({nextTargetRole}) (Optional)
                            </label>
                            <textarea
                              id="forward-remarks"
                              rows={2}
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              placeholder={`Add administrative routing instructions for ${nextTargetName}...`}
                              disabled={actionLoading}
                              className="form-control"
                            />
                          </div>

                          <div
                            style={{
                              fontSize: "12.5px",
                              padding: "8px 12px",
                              backgroundColor: "#f8fafc",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              color: "#475569",
                              marginBottom: "12px",
                            }}
                          >
                            <span>
                              This grievance will be forwarded to: <strong>{nextTargetName}</strong> ({nextTargetRole})
                            </span>
                          </div>

                          <button
                            type="submit"
                            className="authority-primary-button forward-btn"
                            disabled={actionLoading}
                          >
                            <Send size={14} />
                            <span>
                              {actionLoading ? "Forwarding..." : `Forward to ${nextTargetName} →`}
                            </span>
                          </button>
                        </>
                      );
                    })()}
                  </form>
                )}
              </div>
            </section>
          )}

          {/* POST-RESOLUTION REVIEW PIPELINE CARD (MANAGER AUTHORITY) */}
          {isResolved && (
            <section className="detail-card authority-decision-card post-resolution-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Scale size={18} className="text-emerald-700" />
                  <div>
                    <h2 className="text-emerald-900">Post-Resolution Review Pipeline</h2>
                    <p>Authority has resolved this grievance. Review resolution details and choose to formally close or return/reopen.</p>
                  </div>
                </div>
                <span className="decision-required-badge closure-review-badge">CLOSURE REVIEW</span>
              </div>

              <div className="detail-card-body">
                <div className="authority-resolution-notes-box">
                  <span className="resolution-notes-title">AUTHORITY RESOLUTION NOTES</span>
                  <p className="resolution-notes-body">{grievance.resolution_notes || "Formal redressal completed."}</p>
                  <div className="resolution-notes-footer">
                    <User size={12} />
                    <span>Resolved by: {grievance.resolved_by_name || "Authority"}</span>
                    <span className="meta-divider">•</span>
                    <Clock size={12} />
                    <span>{formatDateTime(grievance.resolved_at)}</span>
                  </div>
                </div>

                <div className="action-button-row">
                  <button
                    type="button"
                    className="authority-primary-button close-action-btn"
                    onClick={() => {
                      setCloseModalOpen(true);
                      setCloseError("");
                    }}
                  >
                    <Lock size={14} />
                    <span>Approve & Formally Close Grievance</span>
                  </button>

                  <button
                    type="button"
                    className="secondary-button reopen-action-btn"
                    onClick={() => {
                      setReopenModalOpen(true);
                      setReopenError("");
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reopen / Request Additional Action</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* FORMALLY CLOSED SUMMARY */}
          {isClosed && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Lock size={18} className="text-slate-700" />
                  <div>
                    <h2>Case Concluded & Formally Closed</h2>
                    <p>Permanent institutional archival record</p>
                  </div>
                </div>
                <StatusBadge status="CLOSED" />
              </div>

              <div className="detail-card-body">
                <div className="detail-field full">
                  <span className="detail-field-label">CLOSURE REMARKS</span>
                  <div className="authority-resolution-notes-box">
                    <p className="resolution-notes-body">{grievance.closure_remarks || "Formally verified and closed by Central Manager."}</p>
                  </div>
                </div>

                <div className="resolution-meta-row">
                  <div className="detail-field">
                    <span className="detail-field-label">CLOSED BY</span>
                    <div className="flex-val-row">
                      <User size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{grievance.closed_by_name || "Manager"}</strong>
                    </div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">CLOSED AT</span>
                    <div className="flex-val-row">
                      <Clock size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{formatDateTime(grievance.closed_at)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ATTACHED DOCUMENTS & PROOFS */}
          <section className="detail-card authority-documents-card">
            <div className="detail-card-header">
              <div className="detail-card-title-wrap">
                <Paperclip size={18} className="text-slate-700" />
                <div>
                  <h2>Attached Documents & Proofs</h2>
                  <p>Applicant submissions, official orders, and verification files</p>
                </div>
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
                  <Upload size={14} />
                  <span>{docUploading ? "Uploading..." : "Upload Document"}</span>
                </label>
              </div>
            </div>

            <div className="detail-card-body">
              {docMessage && (
                <div className="authority-doc-success-msg">
                  <CheckCircle2 size={16} />
                  <span>{docMessage}</span>
                </div>
              )}
              {docError && (
                <div className="authority-form-error">
                  <AlertCircle size={16} />
                  <p>{docError}</p>
                </div>
              )}

              <div className="authority-documents-list">
                {(!grievance.documents || grievance.documents.length === 0) ? (
                  <div className="authority-doc-empty">
                    <FolderOpen size={32} className="text-slate-300 mb-2" />
                    <p>No supporting documents have been attached to this grievance yet.</p>
                  </div>
                ) : (
                  grievance.documents.map((doc) => (
                    <div key={doc.id} className="authority-doc-card">
                      <div className="authority-doc-card-info">
                        <div className="authority-doc-icon-wrap">
                          <FileText size={18} className="text-slate-600" />
                        </div>
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
                        <Download size={14} />
                        <span>Download</span>
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
              <div className="detail-card-title-wrap">
                <History size={18} className="text-slate-700" />
                <div>
                  <h2>Grievance Timeline & Audit History</h2>
                  <p>Immutable administrative event log and action sequence</p>
                </div>
              </div>
              <span className="timeline-event-count-badge">{timelineItems.length} Events</span>
            </div>

            <div className="timeline-body">
              {timelineItems.length === 0 ? (
                <div className="timeline-empty-state">
                  <Clock size={28} className="text-slate-300 mb-2" />
                  <p>No timeline events recorded.</p>
                </div>
              ) : (
                timelineItems.map((event, index) => (
                  <div className="timeline-item" key={event.id || index}>
                    <div className="timeline-marker">
                      <span className="timeline-marker-dot" />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header-row">
                        <strong className="timeline-status-tag">{formatStatus(event.status || event.new_status)}</strong>
                        <span className="timeline-timestamp">
                          <Clock size={12} />
                          <span>{formatDateTime(event.created_at || event.date)}</span>
                        </span>
                      </div>
                      <p className="timeline-desc">{event.reason || event.description || "Status updated"}</p>
                      {event.actor_name && (
                        <div className="timeline-actor">
                          <User size={12} />
                          <span>Action by: {event.actor_name}{event.actor_role ? ` (${formatStatus(event.actor_role)})` : ""}</span>
                        </div>
                      )}
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
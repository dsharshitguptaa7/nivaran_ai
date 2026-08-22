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
  Eye,
  History,
  CheckCircle2,
  Scale,
  AlertCircle,
  Check,
  Send,
  FilePlus,
  FolderOpen,
  LayoutDashboard,
} from "lucide-react";

import {
  getGrievance,
  getGrievanceHistory,
  resolveGrievance,
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
import DocumentViewerModal from "../components/DocumentViewerModal";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function AssistantDeanGrievanceDetail() {
  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  // Document Management State
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");

  // =====================================================
  // LOAD GRIEVANCE
  // =====================================================
  useEffect(() => {
    loadGrievance();
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
    } catch (err) {
      console.error("Assistant Dean load grievance error:", err);
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

  // =====================================================
  // ACTIONS
  // =====================================================
  async function handleForwardGrievance(e) {
    if (e) e.preventDefault();
    if (!remarks.trim()) {
      setActionError("Please enter remarks explaining why you are forwarding this grievance.");
      return;
    }

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
      const targetName = updatedGrievance.routing?.assigned_to_name || updatedGrievance.routing?.next_authority_name || grievance.routing?.next_authority_name || grievance.next_authority_name || "Associate Dean";
      const targetRole = (updatedGrievance.routing?.assigned_to_role || updatedGrievance.routing?.next_authority_role || grievance.routing?.next_authority_role || grievance.next_authority_role || "Associate Dean").replaceAll("_", " ");
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

  async function handleResolveGrievance(e) {
    if (e) e.preventDefault();
    if (!resolutionNotes.trim()) {
      setResolveError("Please enter resolution notes detailing the redressal action taken.");
      return;
    }

    try {
      setResolveLoading(true);
      setResolveError("");

      const response = await resolveGrievance(
        grievance.grievance_id,
        resolutionNotes.trim()
      );

      setGrievance(response);
      setResolveModalOpen(false);
      setResolutionNotes("");
      setActionMessage("Grievance marked as resolved and submitted to Manager for closure review.");
      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error("Resolve grievance error:", err);
      setResolveError(err?.message || "Failed to resolve grievance.");
    } finally {
      setResolveLoading(false);
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
    return "Academic Department";
  }

  function getApplicantName(g) {
    if (!g) return "Applicant";
    if (g.routing?.applicant_name) return g.routing.applicant_name;
    if (g.applicant && typeof g.applicant === "object") return g.applicant.full_name || g.applicant.name || "Applicant";
    if (typeof g.submitted_by === "string") return g.submitted_by;
    return "CSJMU Applicant";
  }

  const navItems = [
    { label: "Dashboard", path: "/assistant-dean", icon: <LayoutDashboard size={16} /> },
    { label: "Grievance Detail", path: "#", icon: <FileText size={16} />, active: true },
  ];

  if (loading) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Assistant Dean" userRole="ASSISTANT_DEAN" portalHome="/assistant-dean" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="ASSISTANT DEAN PORTAL" navItems={navItems} userName="Assistant Dean" userRole="ASSISTANT_DEAN" onLogout={handleLogout} />
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
        <AuthorityHeader userName="Assistant Dean" userRole="ASSISTANT_DEAN" portalHome="/assistant-dean" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="ASSISTANT DEAN PORTAL" navItems={navItems} userName="Assistant Dean" userRole="ASSISTANT_DEAN" onLogout={handleLogout} />
          <main className="authority-main">
            <ErrorState title="Unable to load grievance" message={error} backLink="/assistant-dean" backText="← Back to Dashboard" />
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

  const isResolvedOrClosed = grievance.status === "RESOLVED" || grievance.status === "CLOSED";
  const canAct = !isResolvedOrClosed && grievance.status !== "FORWARDED";

  return (
    <div className="authority-page">
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Assistant Dean"}
        userRole={user?.role || "ASSISTANT_DEAN"}
        portalHome="/assistant-dean"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        <AuthoritySidebar
          portalLabel="ASSISTANT DEAN PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Assistant Dean"}
          userRole={user?.role || "ASSISTANT_DEAN"}
          onLogout={handleLogout}
        />

        <main className="authority-main">
          {/* COMPACT BREADCRUMB */}
          <div className="detail-navigation-bar">
            <Link to="/assistant-dean" className="detail-back-link">
              <ArrowLeft size={15} />
              <span>Back to Assistant Dean Dashboard</span>
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
              {!isResolvedOrClosed && (
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
                    <span className="detail-field-label">REFERRED BY</span>
                    <div className="flex-val-row">
                      <GitBranch size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">
                        {grievance.routing?.referred_by_name || "Manager"}
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
              predictedCategory={categoryName}
              finalCategory={grievance.final_category?.name}
              clusterName={clusterName}
              confidenceScore={grievance.ai_confidence}
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

          {/* AUTHORITY ACTIONS SECTION */}
          {canAct && (
            <section className="detail-card authority-decision-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Scale size={18} className="text-amber-600" />
                  <div>
                    <h2>Redressal & Resolution Actions</h2>
                    <p>
                      {grievance.routing?.can_forward && grievance.routing?.next_authority_name
                        ? `Resolve this grievance directly or forward to ${grievance.routing.next_authority_name} for review`
                        : "Review evidence and resolve this grievance directly"}
                    </p>
                  </div>
                </div>
                <span className="decision-required-badge">ACTION REQUIRED</span>
              </div>

              <div className="detail-card-body">
                <div className="action-button-row">
                  <button
                    type="button"
                    className="authority-primary-button resolve-action-btn"
                    onClick={() => {
                      setResolveModalOpen(true);
                      setResolveError("");
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Resolve Grievance Directly</span>
                  </button>
                </div>

                {/* FORWARD FORM (Only shown when next authority exists and forwarding is permitted) */}
                {Boolean(grievance.routing?.can_forward && grievance.routing?.next_authority_name) && (
                  <form onSubmit={handleForwardGrievance} className="forward-form-section">
                    {(() => {
                      const nextTargetName = grievance.routing?.next_authority_name;
                      const nextTargetRole = (grievance.routing?.next_authority_role || "Designated Authority").replaceAll("_", " ");

                      return (
                        <>
                          <div className="form-group">
                            <label htmlFor="forward-remarks">
                              Or Forward with Remarks to {nextTargetName} ({nextTargetRole})
                            </label>
                            <textarea
                              id="forward-remarks"
                              rows={3}
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              placeholder={`Explain why this grievance is being forwarded to ${nextTargetName}...`}
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
                            className="secondary-button forward-btn"
                            disabled={actionLoading || !remarks.trim()}
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

          {/* RESOLUTION RECORD SUMMARY */}
          {(isResolvedOrClosed || grievance.resolution_notes) && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Scale size={18} className="text-slate-700" />
                  <div>
                    <h2>Resolution & Redressal Record</h2>
                    <p>Formally recorded resolution info</p>
                  </div>
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body">
                <div className="detail-field full">
                  <span className="detail-field-label">RESOLUTION NOTES</span>
                  <div className="authority-resolution-notes-box">
                    <p className="resolution-notes-body">{grievance.resolution_notes || "Formal redressal recorded."}</p>
                  </div>
                </div>

                <div className="resolution-meta-row">
                  <div className="detail-field">
                    <span className="detail-field-label">RESOLVED BY</span>
                    <div className="flex-val-row">
                      <User size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">
                        {grievance.resolved_by_name || "Assistant Dean"}
                      </strong>
                    </div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">RESOLVED AT</span>
                    <div className="flex-val-row">
                      <Clock size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">
                        {formatDateTime(grievance.resolved_at)}
                      </strong>
                    </div>
                  </div>
                </div>

                {grievance.status === "RESOLVED" && (
                  <div className="authority-resolution-pending-note">
                    <CheckCircle2 size={15} className="text-amber-600 flex-shrink-0" />
                    <span><strong>Status Note:</strong> This grievance has entered the <strong>Post-Resolution Review Pipeline</strong> for Manager verification and formal closure.</span>
                  </div>
                )}
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
                  id="asst-doc-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleDocumentUpload}
                  disabled={docUploading}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="asst-doc-upload"
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

                      <div className="doc-action-group">
                        <button
                          type="button"
                          className="authority-btn-primary"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
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

      {/* RESOLVE GRIEVANCE MODAL */}
      {resolveModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Resolve Grievance</h2>
                <span className="table-id-chip">{grievance.grievance_id}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setResolveModalOpen(false)}
                disabled={resolveLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveGrievance}>
              <div className="modal-body">
                {resolveError && (
                  <div className="dashboard-error" style={{ marginBottom: "16px" }}>
                    <span>!</span>
                    <p>{resolveError}</p>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="modal-resolution-notes">
                    Resolution Notes & Redressal Directives *
                  </label>
                  <textarea
                    id="modal-resolution-notes"
                    rows={5}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Provide details on the actions taken to redress this grievance..."
                    disabled={resolveLoading}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setResolveModalOpen(false)}
                  disabled={resolveLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="authority-primary-button"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", border: "1px solid #059669" }}
                  disabled={resolveLoading || !resolutionNotes.trim()}
                >
                  {resolveLoading ? "Submitting Resolution..." : "Confirm & Resolve Grievance →"}
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

      {/* GENERAL ATTACHED DOCUMENT IN-SITE PREVIEW */}
      <DocumentViewerModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentData={previewDoc}
        grievanceRequests={grievance.document_requests}
        grievanceId={grievance.grievance_id || grievance.id}
        isApplicant={false}
        onRefresh={loadGrievance}
      />
    </div>
  );
}

export default AssistantDeanGrievanceDetail;
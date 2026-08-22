import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  AlertTriangle,
  FolderOpen,
  LayoutDashboard,
  FilePlus,
  ListOrdered,
  Building2,
  HelpCircle,
} from "lucide-react";

import {
  getGrievance,
  getGrievanceHistory,
} from "../services/grievanceService";
import {
  uploadDocument,
  downloadDocument,
} from "../services/documentService";
import { getCurrentUser, logoutUser } from "../services/authService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import ApplicantInfoCard from "../components/ApplicantInfoCard";
import DocumentRequestsSection from "../components/DocumentRequestsSection";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";


function GrievanceDetail() {
  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================
  useEffect(() => {
    loadGrievance();
  }, [grievanceId]);

  const loadGrievance = async () => {
    try {
      setLoading(true);
      setError("");

      const [grievanceData, historyData, currentUser] = await Promise.all([
        getGrievance(grievanceId),
        getGrievanceHistory(grievanceId).catch(() => []),
        getCurrentUser().catch(() => null),
      ]);

      setGrievance(grievanceData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setUser(currentUser);
    } catch (err) {
      console.error("Grievance loading error:", err);
      if (
        err.message?.toLowerCase().includes("401") ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        logoutUser();
        navigate("/login");
        return;
      }
      setError(err.message || "Unable to load grievance details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !grievance) return;

    if (file.size > 20 * 1024 * 1024) {
      setDocError(`File "${file.name}" exceeds 20MB limit.`);
      return;
    }

    try {
      setUploadingDoc(true);
      setDocError("");
      setDocMessage("");

      await uploadDocument(grievance.grievance_id, file, "ATTACHMENT");
      setDocMessage(`Document "${file.name}" uploaded successfully.`);
      await loadGrievance();
    } catch (err) {
      console.error("Document upload error:", err);
      setDocError(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleDocumentDownload = async (doc) => {
    try {
      await downloadDocument(doc.id, doc.file_name);
    } catch (err) {
      console.error("Download error:", err);
      alert(err.message || "Failed to download document.");
    }
  };

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
    if (!g) return "General";
    if (g.final_category && typeof g.final_category === "object") return g.final_category.name || "General";
    if (g.category && typeof g.category === "object") return g.category.name || "General";
    if (typeof g.category === "string") return g.category;
    return "General";
  }

  function getClusterName(g) {
    if (!g) return "Academic Affairs";
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

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: <FilePlus size={16} /> },
    { label: "My Grievances", path: "/dashboard/grievances", icon: <ListOrdered size={16} /> },
    { label: "Tracking Detail", path: "#", icon: <FileText size={16} />, active: true },
  ];

  if (loading) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Student / Applicant" userRole="APPLICANT" portalHome="/dashboard" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="STUDENT / APPLICANT PORTAL" navItems={navItems} userName="Applicant" userRole="APPLICANT" onLogout={handleLogout} />
          <main className="authority-main">
            <LoadingState message="Loading grievance tracking details..." />
          </main>
        </div>
      </div>
    );
  }

  if (error && !grievance) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Student / Applicant" userRole="APPLICANT" portalHome="/dashboard" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="STUDENT / APPLICANT PORTAL" navItems={navItems} userName="Applicant" userRole="APPLICANT" onLogout={handleLogout} />
          <main className="authority-main">
            <ErrorState title="Unable to load grievance" message={error} backLink="/dashboard/grievances" backText="← Back to My Grievances" />
          </main>
        </div>
      </div>
    );
  }

  if (!grievance) return null;

  const categoryName = getCategoryName(grievance);
  const clusterName = getClusterName(grievance);
  const departmentName = getDepartmentName(grievance);
  const timelineItems = history.length > 0 ? history : (grievance.timeline || []);
  const isResolvedOrClosed = grievance.status === "RESOLVED" || grievance.status === "CLOSED";

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName={user?.full_name || user?.name || "Student / Applicant"}
        userRole={user?.role || "APPLICANT"}
        portalHome="/dashboard"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="STUDENT / APPLICANT PORTAL"
          navItems={navItems}
          userName={user?.full_name || user?.name || "Applicant"}
          userRole={user?.role || "APPLICANT"}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <main className="authority-main">
          {/* COMPACT BREADCRUMB */}
          <div className="detail-navigation-bar">
            <Link to="/dashboard/grievances" className="detail-back-link">
              <ArrowLeft size={15} />
              <span>Back to My Grievances</span>
            </Link>
          </div>

          {/* PAGE HEADER */}
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

            <StatusBadge status={grievance.status} />
          </header>

          {/* NOTIFICATION MESSAGES */}
          {docMessage && (
            <div className="authority-doc-success-msg">
              <CheckCircle2 size={16} />
              <span>{docMessage}</span>
            </div>
          )}
          {docError && (
            <div className="dashboard-error">
              <AlertCircle size={16} />
              <p>{docError}</p>
            </div>
          )}

          {/* ACTION REQUIRED BANNER FOR APPLICANT */}
          {(grievance.status === "AWAITING_INFORMATION" ||
            grievance.document_requests?.some((d) => d.status === "PENDING" || d.status === "REJECTED")) && (
            <div className="applicant-action-required-banner">
              <AlertTriangle size={24} className="text-amber-700 flex-shrink-0" />
              <div>
                <h3>ACTION REQUIRED: Additional Supporting Documents Requested</h3>
                <p>
                  The administrative authority reviewing your grievance has requested additional document(s).
                  Please review the requested items below and upload the necessary files so processing can continue.
                </p>
              </div>
            </div>
          )}

          {/* REQUESTED SUPPORTING DOCUMENTS SECTION */}
          {grievance.document_requests && grievance.document_requests.length > 0 && (
            <div className="detail-section-spacer">
              <DocumentRequestsSection
                documentRequests={grievance.document_requests}
                grievanceId={grievance.grievance_id || grievance.id}
                isApplicant={true}
                onRefresh={loadGrievance}
              />
            </div>
          )}

          {/* 2-COLUMN GRID (DETAILS + APPLICANT INFO) */}
          <div className="detail-top-grid">
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <FileText size={18} className="text-slate-700" />
                  <div>
                    <h2>Grievance Details</h2>
                    <p>Core statement and submission record</p>
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
                    <span className="detail-field-label">DEPARTMENT</span>
                    <div className="flex-val-row">
                      <Building2 size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{departmentName}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <ApplicantInfoCard
              applicant={
                grievance.applicant || {
                  full_name: user?.full_name || user?.name || "Student / Applicant",
                  department: departmentName,
                  subject_name: grievance.subject_name || "General",
                }
              }
            />
          </div>

          {/* REDRESSAL STATUS OVERVIEW CARD */}
          <div className="detail-section-spacer">
            <section className="detail-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Scale size={18} className="text-slate-700" />
                  <div>
                    <h2>Redressal Status & Tracking</h2>
                    <p>Current workflow milestone and procedural status</p>
                  </div>
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body">
                <div className="applicant-status-highlight-box">
                  <span className="current-stage-label">Current Stage</span>
                  <h3 className="current-stage-title">
                    {formatStatus(grievance.status)}
                  </h3>
                  <p className="current-stage-desc">
                    {grievance.status === "SUBMITTED" && "Grievance received in intake queue. Awaiting automated classification."}
                    {grievance.status === "AI_PROCESSING" && "Automated classification engine is determining category and domain routing rules."}
                    {grievance.status === "PENDING_REVIEW" && "Central Redressal Manager is validating classification before authority assignment."}
                    {grievance.status === "ASSIGNED" && "Grievance assigned to designated Assistant Dean / Department for redressal."}
                    {grievance.status === "IN_PROGRESS" && "Designated authority is actively processing and redressing your concern."}
                    {grievance.status === "ESCALATED" && "Grievance referred to higher authority / Dean for institutional determination."}
                    {grievance.status === "RESOLVED" && "Authority has concluded redressal. Under final administrative verification."}
                    {grievance.status === "CLOSED" && "Redressal completed, verified, and officially archived."}
                  </p>
                </div>

                <div className="applicant-help-advisory">
                  <HelpCircle size={15} className="text-slate-500 flex-shrink-0" />
                  <p>You can upload additional documents below anytime to provide new evidence for the assigned authority.</p>
                </div>
              </div>
            </section>
          </div>

          {/* OFFICIAL RESOLUTION RECORD (IF RESOLVED/CLOSED) */}
          {(isResolvedOrClosed || grievance.resolution_notes) && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <Scale size={18} className="text-slate-700" />
                  <div>
                    <h2>Official Redressal Resolution</h2>
                    <p>Formally recorded by authority</p>
                  </div>
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body">
                <div className="detail-field full">
                  <span className="detail-field-label">RESOLUTION REMARKS</span>
                  <div className="authority-resolution-notes-box">
                    <p className="resolution-notes-body">{grievance.resolution_notes || "Your grievance has been successfully redressed by the university."}</p>
                  </div>
                </div>

                <div className="resolution-meta-row">
                  <div className="detail-field">
                    <span className="detail-field-label">RESOLVED BY</span>
                    <div className="flex-val-row">
                      <User size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{grievance.resolved_by_name || "Authority"}</strong>
                    </div>
                  </div>

                  <div className="detail-field">
                    <span className="detail-field-label">RESOLVED AT</span>
                    <div className="flex-val-row">
                      <Clock size={13} className="text-slate-500" />
                      <strong className="detail-field-value text-slate-800">{formatDateTime(grievance.resolved_at)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ATTACHED DOCUMENTS */}
          <section className="detail-card authority-documents-card">
            <div className="detail-card-header">
              <div className="detail-card-title-wrap">
                <Paperclip size={18} className="text-slate-700" />
                <div>
                  <h2>Attached Documents & Evidence</h2>
                  <p>Supporting files submitted by you or uploaded by university authorities</p>
                </div>
              </div>

              <div>
                <input
                  id="applicant-doc-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDoc}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="applicant-doc-upload"
                  className="authority-doc-upload-btn"
                  style={{ cursor: uploadingDoc ? "not-allowed" : "pointer" }}
                >
                  <Upload size={14} />
                  <span>{uploadingDoc ? "Uploading..." : "Upload Additional File"}</span>
                </label>
              </div>
            </div>

            <div className="detail-card-body">
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

          {/* TIMELINE / TRACKING HISTORY */}
          <section className="detail-card timeline-card">
            <div className="detail-card-header">
              <div className="detail-card-title-wrap">
                <History size={18} className="text-slate-700" />
                <div>
                  <h2>Redressal Progress Timeline</h2>
                  <p>Immutable milestone and event progression record</p>
                </div>
              </div>
              <span className="timeline-event-count-badge">{timelineItems.length} Milestones</span>
            </div>

            <div className="timeline-body">
              {timelineItems.length === 0 ? (
                <div className="timeline-empty-state">
                  <Clock size={28} className="text-slate-300 mb-2" />
                  <p>No timeline events recorded yet.</p>
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
    </div>
  );
}

export default GrievanceDetail;
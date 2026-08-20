import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import {
  getGrievance,
  getGrievanceHistory,
  resolveGrievance,
  escalateGrievance,
} from "../services/grievanceService";

import {
  uploadDocument,
  downloadDocument,
} from "../services/documentService";

import { logoutUser } from "../services/authService";

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


function DeanGrievanceDetail() {
  const { grievanceId } = useParams();
  const navigate = useNavigate();

  const [grievance, setGrievance] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

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

      const [data, hist] = await Promise.all([
        getGrievance(grievanceId),
        getGrievanceHistory(grievanceId).catch(() => []),
      ]);

      setGrievance(data);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error("Dean load grievance error:", err);
      setError(err?.message || "Unable to load grievance details.");
    } finally {
      setLoading(false);
    }
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

  function getCategoryName(grv) {
    if (!grv) return "Not classified";
    if (grv.final_category && typeof grv.final_category === "object") return grv.final_category.name || "General";
    if (grv.category && typeof grv.category === "object") return grv.category.name || "General";
    if (typeof grv.category === "string") return grv.category;
    return "Not classified";
  }

  function getClusterName(grv) {
    if (!grv) return "Academic Cluster";
    if (grv.routing?.cluster_name) return grv.routing.cluster_name;
    if (typeof grv.cluster === "string") return grv.cluster;
    return "Academic Affairs";
  }

  function getDepartmentName(grv) {
    if (!grv) return "-";
    if (grv.routing?.subject_name) return grv.routing.subject_name;
    if (typeof grv.department === "string") return grv.department;
    return "University Academic Dept";
  }

  function getApplicantName(grv) {
    if (!grv) return "Applicant";
    if (grv.routing?.applicant_name) return grv.routing.applicant_name;
    if (grv.applicant && typeof grv.applicant === "object") {
      return grv.applicant.full_name || grv.applicant.name || "Applicant";
    }
    if (typeof grv.submitted_by === "string") return grv.submitted_by;
    return "CSJMU Applicant";
  }

  function getReferredByName(grv) {
    if (!grv) return "-";
    if (grv.routing?.referred_by_name) {
      return `${grv.routing.referred_by_name} (${formatStatus(grv.routing.referred_by_role || "Officer")})`;
    }
    if (typeof grv.referred_by === "string") return grv.referred_by;
    return "Manager / Authority";
  }

  function getAssignedToName(grv) {
    if (!grv) return "-";
    if (grv.routing?.assigned_to_name) {
      return `${grv.routing.assigned_to_name} (${formatStatus(grv.routing.current_assigned_role || "Dean")})`;
    }
    if (typeof grv.assigned_to === "string") return grv.assigned_to;
    return "Dean Executive Office";
  }

  // =====================================================
  // DECISION
  // =====================================================
  async function handleDecision(e) {
    e.preventDefault();

    if (!decision) {
      setError("Please select a decision action (Resolve & Approve or Escalate Further).");
      return;
    }

    if (!remarks.trim()) {
      setError("Please enter decision remarks.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setActionSuccess("");

      let updatedGrievance = null;
      if (decision === "APPROVED") {
        updatedGrievance = await resolveGrievance(
          grievance.grievance_id,
          remarks.trim()
        );
        setActionSuccess("Grievance has been successfully resolved and forwarded for Manager formal closure review.");
      } else {
        updatedGrievance = await escalateGrievance(
          grievance.grievance_id,
          "Dean Executive Intervention",
          remarks.trim()
        );
        setActionSuccess("Grievance has been escalated for further institutional action.");
      }

      setGrievance(updatedGrievance);
      setDecision("");
      setRemarks("");

      const updatedHistory = await getGrievanceHistory(grievance.grievance_id);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to record decision.");
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // DOCUMENT HANDLERS
  // =====================================================
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

      await uploadDocument(grievance.grievance_id, file, "RESOLUTION_PROOF");
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

  const navItems = [
    { label: "Executive Dashboard", path: "/dean", icon: "⌂" },
    { label: "Grievance Detail", path: "#", icon: "▤", active: true },
  ];

  if (loading) {
    return (
      <div className="authority-page">
        <AuthorityHeader userName="Dean R&D" userRole="DEAN" portalHome="/dean" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="DEAN EXECUTIVE PORTAL" navItems={navItems} userName="Dean R&D" userRole="DEAN" onLogout={handleLogout} />
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
        <AuthorityHeader userName="Dean R&D" userRole="DEAN" portalHome="/dean" onLogout={handleLogout} />
        <div className="authority-body">
          <AuthoritySidebar portalLabel="DEAN EXECUTIVE PORTAL" navItems={navItems} userName="Dean R&D" userRole="DEAN" onLogout={handleLogout} />
          <main className="authority-main">
            <ErrorState title="Unable to load grievance" message={error} backLink="/dean" backText="← Back to Executive Dashboard" />
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
  const referredByName = getReferredByName(grievance);
  const assignedToName = getAssignedToName(grievance);
  const timelineItems = history.length > 0 ? history : (grievance.timeline || []);
  const canMakeDecision = ["ASSIGNED", "ESCALATED", "IN_PROGRESS", "PENDING_APPROVAL", "PENDING_REVIEW"].includes(
    grievance.status
  );

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName="Dean R&D"
        userRole="DEAN"
        portalHome="/dean"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="DEAN EXECUTIVE PORTAL"
          navItems={navItems}
          userName="Dean R&D"
          userRole="DEAN"
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT AREA */}
        <main className="authority-main">
          {/* BACK BREADCRUMB */}
          <Link to="/dean" className="detail-back-link">
            ← Back to Executive Dashboard
          </Link>

          {/* PAGE HEADER */}
          <header className="detail-page-header">
            <div>
              <span className="table-id-chip">{grievance.grievance_id}</span>
              <h1>{grievance.title}</h1>
              <p>Submitted on {formatDate(grievance.submitted_at)} ({formatDateTime(grievance.submitted_at)})</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {grievance.status !== "RESOLVED" && grievance.status !== "CLOSED" && (
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

          {/* STATUS NOTIFICATIONS */}
          {actionSuccess && (
            <div className="authority-doc-success-msg" style={{ marginBottom: "20px" }}>
              ✓ {actionSuccess}
            </div>
          )}

          {error && (
            <div className="dashboard-error" style={{ marginBottom: "20px" }}>
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {/* TOP 2-COLUMN GRID (DETAILS + APPLICANT INFO) */}
          <div className="detail-top-grid">
            {/* DETAILS CARD */}
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
                    <span>REFERRED BY</span>
                    <strong>{referredByName}</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* APPLICANT INFO CARD */}
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

          {/* AI ANALYSIS CARD */}
          <div style={{ marginTop: "24px" }}>
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
            <div style={{ marginTop: "24px" }}>
              <DocumentRequestsSection
                documentRequests={grievance.document_requests}
                grievanceId={grievance.grievance_id || grievance.id}
                isApplicant={false}
                onRefresh={loadGrievance}
              />
            </div>
          )}

          {/* DEAN DECISION & REDRESSAL CARD */}
          {canMakeDecision && (
            <section className="detail-card dean-decision-card">
              <div className="detail-card-header">
                <div>
                  <h2>Dean Executive Decision & Redressal</h2>
                  <p>Record the institutional-level decision for this grievance.</p>
                </div>
                <span className="decision-required-badge">ACTION REQUIRED</span>
              </div>

              <form className="decision-form" onSubmit={handleDecision}>
                <div className="decision-options">
                  <label className={decision === "APPROVED" ? "decision-option selected" : "decision-option"}>
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={decision === "APPROVED"}
                      onChange={(e) => setDecision(e.target.value)}
                    />
                    <div>
                      <strong>Resolve & Approve Redressal</strong>
                      <span>Approve formal resolution and submit for Manager closure review.</span>
                    </div>
                  </label>

                  <label className={decision === "ESCALATED" ? "decision-option selected" : "decision-option"}>
                    <input
                      type="radio"
                      name="decision"
                      value="ESCALATED"
                      checked={decision === "ESCALATED"}
                      onChange={(e) => setDecision(e.target.value)}
                    />
                    <div>
                      <strong>Escalate Further</strong>
                      <span>Refer to Higher University Syndicate / Vice-Chancellor office.</span>
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="remarks">Executive Decision Remarks *</label>
                  <textarea
                    id="remarks"
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter detailed directives, instructions, or resolution remarks..."
                    disabled={submitting}
                  />
                </div>

                <div className="decision-actions">
                  <Link to="/dean" className="secondary-button">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="authority-primary-button"
                    disabled={submitting || !decision}
                  >
                    {submitting ? "Recording Decision..." : "Record Decision →"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* RESOLUTION RECORD SUMMARY */}
          {(grievance.status === "RESOLVED" || grievance.status === "CLOSED" || grievance.resolution_notes) && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div>
                  <h2>Resolution & Redressal Record</h2>
                  <span>Formally recorded resolution info</span>
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="detail-field full">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLUTION NOTES</span>
                  <div className="authority-resolution-notes-box" style={{ marginTop: "6px" }}>
                    {grievance.resolution_notes || "Formal redressal completed and validated."}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLVED BY</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {grievance.resolved_by_name || "Dean Office"}
                    </strong>
                  </div>

                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLVED AT</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {formatDateTime(grievance.resolved_at)}
                    </strong>
                  </div>
                </div>

                {grievance.status === "RESOLVED" && (
                  <div className="authority-resolution-pending-note" style={{ marginTop: "1rem" }}>
                    ℹ️ <strong>Status Note:</strong> This grievance has entered the <strong>Post-Resolution Review Pipeline</strong> for Manager verification and final formal closure.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ATTACHED DOCUMENTS */}
          <section className="detail-card authority-documents-card">
            <div className="detail-card-header">
              <div>
                <h2>Attached Documents & Proofs</h2>
                <p>Applicant submissions, official orders, and verification files.</p>
              </div>

              <div>
                <input
                  id="dean-doc-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleDocumentUpload}
                  disabled={docUploading}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="dean-doc-upload"
                  className="authority-doc-upload-btn"
                  style={{ cursor: docUploading ? "not-allowed" : "pointer" }}
                >
                  {docUploading ? "Uploading..." : "+ Upload Document"}
                </label>
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {docMessage && (
                <div className="authority-doc-success-msg">✓ {docMessage}</div>
              )}
              {docError && (
                <div className="authority-form-error"><span>!</span><p>{docError}</p></div>
              )}

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

export default DeanGrievanceDetail;
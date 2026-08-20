import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

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
    { label: "Dashboard", path: "/dashboard", icon: "⌂" },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: "✎" },
    { label: "My Grievances", path: "/dashboard/grievances", icon: "≡" },
    { label: "Tracking Detail", path: "#", icon: "▤", active: true },
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
          {/* BREADCRUMB */}
          <Link to="/dashboard/grievances" className="detail-back-link">
            ← Back to My Grievances
          </Link>

          {/* PAGE HEADER */}
          <header className="detail-page-header">
            <div>
              <span className="table-id-chip">{grievance.grievance_id}</span>
              <h1>{grievance.title}</h1>
              <p>Submitted on {formatDate(grievance.submitted_at)} ({formatDateTime(grievance.submitted_at)})</p>
            </div>

            <StatusBadge status={grievance.status} />
          </header>

          {/* NOTIFICATION MESSAGES */}
          {docMessage && <div className="authority-doc-success-msg" style={{ marginBottom: "20px" }}>✓ {docMessage}</div>}
          {docError && <div className="dashboard-error" style={{ marginBottom: "20px" }}><span>!</span><p>{docError}</p></div>}

          {/* ACTION REQUIRED BANNER FOR APPLICANT */}
          {(grievance.status === "AWAITING_INFORMATION" ||
            grievance.document_requests?.some((d) => d.status === "PENDING" || d.status === "REJECTED")) && (
            <div
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "18px 22px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                boxShadow: "0 2px 6px rgba(180, 83, 9, 0.08)",
              }}
            >
              <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>⚠</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#92400e" }}>
                  ACTION REQUIRED: Additional Supporting Documents Requested
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.88rem", color: "#78350f", lineHeight: "1.4" }}>
                  The administrative authority reviewing your grievance has requested additional document(s).
                  Please review the requested items below and upload the necessary files so processing can continue.
                </p>
              </div>
            </div>
          )}

          {/* REQUESTED SUPPORTING DOCUMENTS SECTION */}
          {grievance.document_requests && grievance.document_requests.length > 0 && (
            <DocumentRequestsSection
              documentRequests={grievance.document_requests}
              grievanceId={grievance.grievance_id || grievance.id}
              isApplicant={true}
              onRefresh={loadGrievance}
            />
          )}

          {/* 2-COLUMN GRID (DETAILS + APPLICANT INFO) */}
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
                    <span>DEPARTMENT</span>
                    <strong>{departmentName}</strong>
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
          <div style={{ marginTop: "24px" }}>
            <section className="detail-card">
              <div className="detail-card-header">
                <h2>Redressal Status & Tracking</h2>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="applicant-status-highlight-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Current Stage</span>
                  <h3 style={{ fontSize: "16px", color: "var(--primary, #70162a)", margin: "4px 0 6px" }}>
                    {formatStatus(grievance.status)}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
                    {grievance.status === "SUBMITTED" && "Grievance received in intake queue. Awaiting automated AI classification."}
                    {grievance.status === "AI_PROCESSING" && "NIVARAN AI engine is categorizing and determining routing rules."}
                    {grievance.status === "PENDING_REVIEW" && "Central Manager is reviewing AI recommendations before officer assignment."}
                    {grievance.status === "ASSIGNED" && "Grievance assigned to designated Assistant Dean / Department for investigation."}
                    {grievance.status === "IN_PROGRESS" && "Designated authority is actively processing and redressing your concern."}
                    {grievance.status === "ESCALATED" && "Grievance referred to higher authority / Dean for institutional decision."}
                    {grievance.status === "RESOLVED" && "Authority has concluded redressal. Under final administrative verification."}
                    {grievance.status === "CLOSED" && "Redressal completed, verified, and officially archived."}
                  </p>
                </div>

                <div className="ai-advisory-box">
                  <span className="ai-advisory-bullet">•</span>
                  <div>
                    <strong>Need Help?</strong>
                    <p>You can upload additional documents below anytime to provide new evidence for the assigned officer.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* OFFICIAL RESOLUTION RECORD (IF RESOLVED/CLOSED) */}
          {(isResolvedOrClosed || grievance.resolution_notes) && (
            <section className="detail-card authority-resolution-card">
              <div className="detail-card-header">
                <div>
                  <h2>Official Redressal Resolution</h2>
                  <span>Formally recorded by authority</span>
                </div>
                <StatusBadge status={grievance.status} />
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="detail-field full">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLUTION REMARKS</span>
                  <div className="authority-resolution-notes-box" style={{ marginTop: "6px" }}>
                    {grievance.resolution_notes || "Your grievance has been successfully redressed by the university."}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLVED BY</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {grievance.resolved_by_name || "Authority"}
                    </strong>
                  </div>

                  <div className="detail-field">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>RESOLVED AT</span>
                    <strong style={{ fontSize: "14px", marginTop: "4px", display: "block" }}>
                      {formatDateTime(grievance.resolved_at)}
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
                <h2>Attached Documents & Evidence</h2>
                <p>Supporting files submitted by you or uploaded by university authorities.</p>
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
                  {uploadingDoc ? "Uploading..." : "+ Upload Additional File"}
                </label>
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
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

          {/* TIMELINE / TRACKING HISTORY */}
          <section className="detail-card timeline-card">
            <div className="detail-card-header">
              <h2>Redressal Progress Timeline</h2>
              <span>{timelineItems.length} milestone(s)</span>
            </div>

            <div className="timeline-body">
              {timelineItems.length === 0 ? (
                <div style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>No timeline events recorded yet.</div>
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
    </div>
  );
}

export default GrievanceDetail;
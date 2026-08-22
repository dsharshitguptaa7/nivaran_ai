import { useState } from "react";
import {
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Eye,
  Download,
  Upload,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  uploadRequestedDocument,
  reviewRequestedDocument,
} from "../services/documentRequestService";
import { downloadDocument } from "../services/documentService";
import { API_BASE_URL } from "../services/api";
import DocumentViewerModal from "./DocumentViewerModal";

export default function DocumentRequestsSection({
  documentRequests = [],
  grievanceId,
  isApplicant = false,
  onRefresh,
}) {
  const [uploadingId, setUploadingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectPromptId, setRejectPromptId] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // In-Site Document Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [viewerReqItem, setViewerReqItem] = useState(null);

  if (!documentRequests || documentRequests.length === 0) {
    return null;
  }

  const openViewer = (doc, reqItem) => {
    setViewerDoc(doc);
    setViewerReqItem(reqItem);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerDoc(null);
    setViewerReqItem(null);
  };

  const handleFileUpload = async (requestId, file) => {
    if (!file) return;
    try {
      setUploadingId(requestId);
      setError("");
      setSuccessMsg("");

      await uploadRequestedDocument(grievanceId, requestId, file);

      setSuccessMsg("Document uploaded successfully! Waiting for authority review.");
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setReviewingId(requestId);
      setError("");
      await reviewRequestedDocument(grievanceId, requestId, {
        action: "APPROVE",
        remarks: "Document verified and approved by authority.",
      });
      setSuccessMsg("Document verified and approved successfully!");
      if (viewerOpen) {
        closeViewer();
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to approve document.");
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectSubmit = async (requestId) => {
    try {
      setReviewingId(requestId);
      setError("");
      await reviewRequestedDocument(grievanceId, requestId, {
        action: "REJECT",
        remarks: rejectRemarks.trim() || "Document does not meet requirements. Please re-upload.",
      });
      setRejectPromptId(null);
      setRejectRemarks("");
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to request re-upload.");
    } finally {
      setReviewingId(null);
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      setDownloadingId(docId);
      setError("");
      await downloadDocument(docId, fileName || "document");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return { label: "Approved", icon: <CheckCircle2 size={12} />, bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" };
      case "UPLOADED":
        return { label: "Uploaded (Pending Review)", icon: <Upload size={12} />, bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
      case "REJECTED":
        return { label: "Re-upload Required", icon: <AlertTriangle size={12} />, bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "PENDING":
      default:
        return { label: "Action Required", icon: <Clock size={12} />, bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
    }
  };

  const formatDate = (date) => {
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
  };

  return (
    <div
      className="authority-card"
      style={{
        border: "1px solid var(--border-color, #e2e8f0)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color, #e5e7eb)",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FolderOpen size={18} className="text-slate-700" />
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
            Requested Supporting Documents
          </h3>
        </div>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: "600",
            padding: "4px 8px",
            borderRadius: "6px",
            background: "#f1f5f9",
            color: "#475569",
          }}
        >
          {documentRequests.length} Item{documentRequests.length > 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {documentRequests.map((req) => {
          const badge = getStatusBadge(req.status);
          const isPending = req.status === "PENDING" || req.status === "REJECTED";
          const isUploaded = req.status === "UPLOADED";
          const isApproved = req.status === "APPROVED";

          return (
            <div
              key={req.id}
              style={{
                border: `1px solid ${badge.border}`,
                borderRadius: "10px",
                padding: "16px",
                background: req.status === "PENDING" ? "#fffdf5" : "var(--bg-card-alt, #fafaf9)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: "700", color: "#1e293b" }}>
                      {req.document_name}
                    </h4>
                    {req.is_required ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          background: "#fee2e2",
                          color: "#b91c1c",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Mandatory
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          background: "#f1f5f9",
                          color: "#64748b",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Optional
                      </span>
                    )}
                  </div>

                  {req.description && (
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "#4b5563" }}>
                      {req.description}
                    </p>
                  )}
                </div>

                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>

              {/* METADATA INFO */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px",
                  fontSize: "0.78rem",
                  color: "#64748b",
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px dashed #e2e8f0",
                }}
              >
                {req.requested_by && (
                  <span>
                    Requested by: <strong>{req.requested_by.full_name} ({req.requested_by.role})</strong>
                  </span>
                )}
                <span>Requested on: <strong>{formatDate(req.requested_at)}</strong></span>
                {req.deadline && (
                  <span style={{ color: new Date(req.deadline) < new Date() ? "#b91c1c" : "#64748b" }}>
                    Deadline: <strong>{formatDate(req.deadline)}</strong>
                    {new Date(req.deadline) < new Date() && " (Overdue)"}
                  </span>
                )}
              </div>

              {/* REJECTION REMARKS */}
              {req.status === "REJECTED" && req.review_remarks && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    marginTop: "10px",
                  }}
                >
                  <strong>Re-upload Reason:</strong> {req.review_remarks}
                </div>
              )}

              {/* UPLOADED DOCUMENT PREVIEW */}
              {req.uploaded_document && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Paperclip size={16} className="text-slate-500" />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "0.86rem", color: "#0f172a" }}>
                        {req.uploaded_document.file_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Uploaded: {formatDate(req.uploaded_document.created_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openViewer(req.uploaded_document, req)}
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        color: "#ffffff",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        background: "#881337",
                        border: "1px solid #70162a",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 1px 3px rgba(91, 16, 33, 0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Eye size={13} />
                      <span>View Document</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(req.uploaded_document.id, req.uploaded_document.file_name)}
                      disabled={downloadingId === req.uploaded_document.id}
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        color: "#881337",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "#faf8f5",
                        border: "1px solid #d4c5b9",
                        cursor: downloadingId === req.uploaded_document.id ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.2s ease",
                      }}
                      title="Download copy"
                    >
                      <Download size={13} />
                      <span>{downloadingId === req.uploaded_document.id ? "Downloading..." : "Download"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* APPLICANT UPLOAD CONTROLS */}
              {isApplicant && isPending && (
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#881337",
                      color: "#ffffff",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: uploadingId === req.id ? "not-allowed" : "pointer",
                      boxShadow: "0 1px 3px rgba(91, 16, 33, 0.2)",
                    }}
                  >
                    <Upload size={14} />
                    <span>{uploadingId === req.id ? "Uploading..." : "Choose File & Upload"}</span>
                    <input
                      type="file"
                      disabled={uploadingId === req.id}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(req.id, e.target.files[0]);
                        }
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  <span style={{ fontSize: "0.76rem", color: "#64748b" }}>Max 20MB (PDF, PNG, JPG, DOCX)</span>
                </div>
              )}

              {/* AUTHORITY REVIEW ACTIONS */}
              {!isApplicant && isUploaded && (
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(req.id)}
                    disabled={reviewingId === req.id}
                    style={{
                      background: "#059669",
                      border: "1px solid #047857",
                      color: "#ffffff",
                      padding: "7px 16px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: reviewingId === req.id ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{reviewingId === req.id ? "Verifying..." : "Verify & Approve Document"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectPromptId(req.id)}
                    disabled={reviewingId === req.id}
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      padding: "7px 14px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: reviewingId === req.id ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <XCircle size={14} />
                    <span>Request Re-upload</span>
                  </button>
                </div>
              )}

              {/* REJECT PROMPT MODAL / INLINE INPUT */}
              {!isApplicant && rejectPromptId === req.id && (
                <div
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    borderRadius: "8px",
                    padding: "12px",
                    marginTop: "12px",
                  }}
                >
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#9f1239", marginBottom: "6px" }}>
                    Reason for Rejection / Instructions for Applicant:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectRemarks}
                    onChange={(e) => setRejectRemarks(e.target.value)}
                    placeholder="e.g. The document is blurry or expired. Please upload a clear official copy."
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #fda4af",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleRejectSubmit(req.id)}
                      disabled={reviewingId === req.id}
                      style={{
                        background: "#e11d48",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Confirm Rejection & Notify Applicant
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectPromptId(null)}
                      style={{
                        background: "none",
                        border: "1px solid #cbd5e1",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* IN-SITE DOCUMENT PREVIEW & VERIFICATION MODAL */}
      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={closeViewer}
        documentData={viewerDoc}
        requestItem={viewerReqItem}
        isAuthority={!isApplicant}
        onApprove={(reqId) => handleApprove(reqId)}
        onReject={(reqId) => {
          closeViewer();
          setRejectPromptId(reqId);
        }}
        actionLoading={reviewingId !== null}
      />
    </div>
  );
}

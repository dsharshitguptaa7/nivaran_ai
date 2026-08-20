import { useEffect, useState } from "react";
import { reviewRequestedDocument } from "../services/documentRequestService";
import { API_BASE_URL } from "../services/api";

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentData,
  requestItem,
  grievanceRequests = [],
  grievanceId,
  isApplicant = false,
  onApprove,
  onReject,
  onRefresh,
  actionLoading = false,
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const docId = documentData?.id;
  const fileName = documentData?.file_name || "document";
  const lowerName = fileName.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName);
  const isPdf = /\.pdf$/i.test(lowerName);

  // Match requestItem if not directly provided
  const matchedReq =
    requestItem ||
    grievanceRequests?.find(
      (r) =>
        r.uploaded_document_id === documentData?.id ||
        r.uploaded_document?.id === documentData?.id
    );

  const reqStatus = matchedReq?.status || (documentData?.document_type === "REQUESTED_DOCUMENT" ? "UPLOADED" : null);
  const isPendingReview = reqStatus === "UPLOADED";
  const isApproved = reqStatus === "APPROVED";
  const reqId = matchedReq?.id;
  const isAuthority = !isApplicant;

  useEffect(() => {
    if (!isOpen || !docId) {
      setBlobUrl(null);
      setRejectPromptOpen(false);
      setRejectRemarks("");
      return;
    }

    let active = true;
    let createdUrl = null;

    const fetchDocumentBlob = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("access_token");
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE_URL}/documents/${docId}/download`, {
          headers,
        });

        if (!res.ok) {
          let errDetail = "Failed to load document preview";
          try {
            const errJson = await res.json();
            errDetail = errJson?.detail || errDetail;
          } catch {}
          throw new Error(errDetail);
        }

        const blob = await res.blob();
        if (active) {
          createdUrl = window.URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      } catch (err) {
        if (active) {
          console.error("Preview load error:", err);
          setError(err.message || "Failed to load document preview.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDocumentBlob();

    return () => {
      active = false;
      if (createdUrl) {
        window.URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, docId]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = window.document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const handleVerifyApprove = async () => {
    if (onApprove && reqId) {
      onApprove(reqId);
      return;
    }
    const targetGrievanceId = grievanceId || documentData?.grievance_id || matchedReq?.grievance_id;
    if (!reqId || !targetGrievanceId) return;

    try {
      setInternalLoading(true);
      setError("");
      await reviewRequestedDocument(targetGrievanceId, reqId, {
        action: "APPROVE",
        remarks: "Document verified and approved by authority.",
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error("Approval error:", err);
      setError(err.message || "Failed to verify document.");
    } finally {
      setInternalLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (onReject && reqId) {
      onReject(reqId);
      return;
    }
    const targetGrievanceId = grievanceId || documentData?.grievance_id || matchedReq?.grievance_id;
    if (!reqId || !targetGrievanceId) return;

    try {
      setInternalLoading(true);
      setError("");
      await reviewRequestedDocument(targetGrievanceId, reqId, {
        action: "REJECT",
        remarks: rejectRemarks.trim() || "Document does not meet requirements. Please re-upload.",
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error("Rejection error:", err);
      setError(err.message || "Failed to request re-upload.");
    } finally {
      setInternalLoading(false);
      setRejectPromptOpen(false);
    }
  };

  return (
    <div className="authority-modal-overlay" onClick={onClose}>
      <div
        className="authority-modal-card"
        style={{
          maxWidth: "880px",
          width: "95%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="authority-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "1.3rem" }}>{isImage ? "🖼️" : isPdf ? "📄" : "📎"}</span>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {matchedReq?.document_name ? `${matchedReq.document_name} — ` : ""}
                {fileName}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#fce7f3", opacity: 0.9 }}>
                In-Site Secure Document Preview
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !blobUrl}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: "600",
                cursor: loading || !blobUrl ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
              title="Download copy to disk"
            >
              ⬇ Download
            </button>
            <button
              type="button"
              className="authority-modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL BODY (PREVIEW CONTAINER) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#1e293b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "380px",
          }}
        >
          {loading && (
            <div style={{ color: "#ffffff", textAlign: "center", padding: "40px" }}>
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "12px",
                  animation: "spin 1s infinite linear",
                }}
              >
                ⏳
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>
                Loading document preview...
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "20px",
                borderRadius: "10px",
                maxWidth: "480px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>⚠️</span>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", fontWeight: "700" }}>
                Unable to preview document
              </h4>
              <p style={{ margin: "0 0 14px 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
                {error}
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="authority-btn-secondary"
                style={{ fontSize: "0.82rem" }}
              >
                ⬇ Try Direct Download
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isImage ? (
                <img
                  src={blobUrl}
                  alt={fileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "68vh",
                    objectFit: "contain",
                    borderRadius: "6px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    background: "#0f172a",
                  }}
                />
              ) : isPdf ? (
                <iframe
                  src={blobUrl}
                  title={fileName}
                  style={{
                    width: "100%",
                    height: "68vh",
                    border: "none",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "10px",
                    padding: "30px",
                    textAlign: "center",
                    maxWidth: "420px",
                  }}
                >
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "10px" }}>📄</span>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}>
                    {fileName}
                  </h4>
                  <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#64748b" }}>
                    This file format does not support inline web preview. You can download the file to view it.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="authority-btn-primary"
                    style={{ fontSize: "0.85rem" }}
                  >
                    ⬇ Download {fileName}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INLINE REJECT PROMPT INSIDE MODAL */}
        {rejectPromptOpen && (
          <div
            style={{
              background: "#fff1f2",
              borderTop: "1px solid #fecdd3",
              padding: "16px 20px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.84rem",
                fontWeight: "600",
                color: "#9f1239",
                marginBottom: "6px",
              }}
            >
              Reason for Rejection / Instructions for Applicant:
            </label>
            <textarea
              rows={2}
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. The uploaded file is blurred or incomplete. Please upload a clear official copy."
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
                onClick={handleRejectSubmit}
                disabled={internalLoading}
                style={{
                  background: "#e11d48",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {internalLoading ? "Rejecting..." : "Confirm Rejection & Notify Applicant"}
              </button>
              <button
                type="button"
                onClick={() => setRejectPromptOpen(false)}
                style={{
                  background: "none",
                  border: "1px solid #cbd5e1",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* MODAL FOOTER WITH VERIFY / APPROVE ACTIONS */}
        <div
          className="authority-modal-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
          }}
        >
          <div>
            {isApproved && (
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  color: "#065f46",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                ✓ Verified & Approved
              </span>
            )}
            {isPendingReview && (
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  color: "#1e40af",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                📤 Uploaded (Pending Review)
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isAuthority && isPendingReview && reqId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onReject) {
                      onReject(reqId);
                    } else {
                      setRejectPromptOpen(true);
                    }
                  }}
                  disabled={actionLoading || internalLoading}
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: actionLoading || internalLoading ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  ✕ Request Re-upload
                </button>

                <button
                  type="button"
                  onClick={handleVerifyApprove}
                  disabled={actionLoading || internalLoading}
                  style={{
                    background: "#059669",
                    border: "1px solid #047857",
                    color: "#ffffff",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    fontSize: "0.84rem",
                    fontWeight: "600",
                    cursor: actionLoading || internalLoading ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  {actionLoading || internalLoading ? "Verifying..." : "✓ Verify & Approve Document"}
                </button>
              </>
            )}

            <button
              type="button"
              className="authority-btn-secondary"
              onClick={onClose}
              style={{ fontSize: "0.82rem" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

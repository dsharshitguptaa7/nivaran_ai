import { useState } from "react";
import { FilePlus, AlertCircle, Trash2, Plus, Send, X } from "lucide-react";
import { requestDocuments } from "../services/documentRequestService";

export default function RequestDocumentModal({
  isOpen,
  onClose,
  grievanceId,
  onSuccess,
}) {
  const [documents, setDocuments] = useState([
    { document_name: "", description: "", is_required: true },
  ]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDocChange = (index, field, value) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  const handleAddDocument = () => {
    setDocuments([
      ...documents,
      { document_name: "", description: "", is_required: true },
    ]);
  };

  const handleRemoveDocument = (index) => {
    if (documents.length <= 1) return;
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate
    for (let i = 0; i < documents.length; i++) {
      if (!documents[i].document_name.trim()) {
        setError(`Please enter a document name for Document #${i + 1}.`);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        documents: documents.map((d) => ({
          document_name: d.document_name.trim(),
          description: d.description.trim() || null,
          is_required: d.is_required,
        })),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      };

      await requestDocuments(grievanceId, payload);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit document request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authority-modal-overlay" onClick={onClose}>
      <div
        className="authority-modal-card"
        style={{ maxWidth: "620px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="authority-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FilePlus size={20} className="text-slate-700" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>
                Request Additional Documents
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary, #6b7280)" }}>
                Temporarily pause grievance in applicant queue until requested documents are uploaded.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="authority-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="authority-modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-card-alt, #f9fafb)",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontWeight: "600", fontSize: "0.88rem", color: "var(--text-primary, #111827)" }}>
                      Document #{idx + 1}
                    </span>
                    {documents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", marginBottom: "4px" }}>
                      Document Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={doc.document_name}
                      onChange={(e) => handleDocChange(idx, "document_name", e.target.value)}
                      placeholder="e.g. Fellowship Award Letter, Fee Receipt, Caste Certificate"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid var(--border-color, #d1d5db)",
                        borderRadius: "6px",
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", marginBottom: "4px" }}>
                      Reason / Instructions for Applicant (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={doc.description}
                      onChange={(e) => handleDocChange(idx, "description", e.target.value)}
                      placeholder="Explain why this document is required or specific criteria it must meet..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid var(--border-color, #d1d5db)",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        boxSizing: "border-box",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.82rem",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={doc.is_required}
                      onChange={(e) => handleDocChange(idx, "is_required", e.target.checked)}
                    />
                    <span>Mandatory document (blocks workflow progression until submitted)</span>
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddDocument}
                style={{
                  background: "#faf8f5",
                  border: "1px dashed #5b1021",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "#5b1021",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={15} />
                <span>Add Another Document Request</span>
              </button>

              <div style={{ marginTop: "6px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", marginBottom: "4px" }}>
                  Submission Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border-color, #d1d5db)",
                    borderRadius: "6px",
                    fontSize: "0.88rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="authority-modal-footer"
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "14px 20px" }}
          >
            <button
              type="button"
              className="authority-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="authority-btn-primary"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Send size={14} />
              <span>{loading ? "Sending Request..." : "Send Document Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createGrievance } from "../services/grievanceService";
import { uploadDocument } from "../services/documentService";
import { logoutUser } from "../services/authService";

import AuthorityHeader from "../components/AuthorityHeader";
import AuthoritySidebar from "../components/AuthoritySidebar";
import ErrorState from "../components/ErrorState";


function SubmitGrievance() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const validFiles = [];
    for (const f of selectedFiles) {
      if (f.size > 20 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds 20MB limit.`);
        return;
      }
      validFiles.push(f);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError("");
    e.target.value = "";
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");

    if (title.trim().length < 5) {
      setError("Title must contain at least 5 characters.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Description must contain at least 20 characters.");
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("Registering grievance in central intake...");

      const grievance = await createGrievance(title.trim(), description.trim());

      if (files.length > 0) {
        setStatusMessage(`Uploading ${files.length} document attachment(s)...`);
        for (let i = 0; i < files.length; i++) {
          try {
            await uploadDocument(grievance.grievance_id, files[i], "ATTACHMENT");
          } catch (uploadErr) {
            console.error(`Failed to upload ${files[i].name}:`, uploadErr);
          }
        }
      }

      setStatusMessage("Grievance registered successfully! Redirecting to tracking view...");
      setTimeout(() => {
        navigate(`/dashboard/grievances/${grievance.grievance_id}`);
      }, 1000);
    } catch (err) {
      console.error("Grievance submission failed:", err);
      setError(err.message || "Failed to submit grievance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "⌂" },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: "✎", active: true },
    { label: "My Grievances", path: "/dashboard/grievances", icon: "≡" },
  ];

  return (
    <div className="authority-page">
      {/* GLOBAL HEADER */}
      <AuthorityHeader
        userName="Student / Applicant"
        userRole="APPLICANT"
        portalHome="/dashboard"
        onLogout={handleLogout}
      />

      <div className="authority-body">
        {/* GLOBAL SIDEBAR */}
        <AuthoritySidebar
          portalLabel="STUDENT / APPLICANT PORTAL"
          navItems={navItems}
          userName="Applicant"
          userRole="APPLICANT"
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <main className="authority-main">
          {/* BREADCRUMB */}
          <Link to="/dashboard" className="detail-back-link">
            ← Back to Dashboard
          </Link>

          {/* PAGE HEADER */}
          <section className="authority-page-header">
            <div>
              <div className="authority-page-eyebrow">NEW COMPLAINT / GRIEVANCE REGISTRATION</div>
              <h1>Submit a Grievance</h1>
              <p>Submit your academic, administrative, hostel, or examination concerns for autonomous AI classification and authority redressal.</p>
            </div>
          </section>

          {/* NOTIFICATION */}
          {statusMessage && (
            <div className="authority-doc-success-msg" style={{ marginBottom: "20px" }}>
              ✓ {statusMessage}
            </div>
          )}

          {error && (
            <div className="dashboard-error" style={{ marginBottom: "20px" }}>
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {/* 2-COLUMN GRID (FORM + AI INFO) */}
          <div className="detail-top-grid">
            {/* SUBMISSION FORM CARD */}
            <section className="detail-card">
              <div className="detail-card-header">
                <h2>Grievance Particulars</h2>
                <span>All fields required</span>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
                <div className="form-group">
                  <label htmlFor="title">Grievance Title / Subject *</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="E.g., Discrepancy in Semester 4 Grade Card Marks"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Minimum 5 characters. Be specific and concise.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Detailed Description *</label>
                  <textarea
                    id="description"
                    rows={6}
                    placeholder="Provide detailed information regarding the issue, roll number, course, dates, and previous attempts to resolve..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Minimum 20 characters. Include all relevant facts.
                  </small>
                </div>

                {/* FILE ATTACHMENTS */}
                <div className="form-group">
                  <label>Supporting Documents & Evidence (Optional)</label>
                  <div className="applicant-file-dropzone" style={{ border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "20px", textAlign: "center", background: "#f8fafc", marginTop: "6px" }}>
                    <input
                      id="applicant-file-input"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      disabled={loading}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="applicant-file-input" style={{ cursor: "pointer", display: "block" }}>
                      <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>📎</span>
                      <strong style={{ color: "var(--primary, #70162a)" }}>Click to browse files</strong> or drag and drop
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>PDF, PNG, JPG, DOCX (Max 20MB per file)</p>
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {files.map((file, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px" }}>
                          <div>
                            <strong>{file.name}</strong> <span style={{ color: "#64748b" }}>({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                  <Link to="/dashboard" className="secondary-button">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="authority-primary-button"
                    disabled={loading || !title.trim() || !description.trim()}
                  >
                    {loading ? "Submitting Grievance..." : "Submit Grievance →"}
                  </button>
                </div>
              </form>
            </section>

            {/* AI SYSTEM GUIDANCE CARD */}
            <section className="detail-card ai-analysis-card">
              <div className="detail-card-header">
                <div className="ai-card-title">
                  <div className="ai-detail-icon">AI</div>
                  <div>
                    <h2>Autonomous Redressal Pipeline</h2>
                    <span className="ai-model-tag">CSJMU Core Engine</span>
                  </div>
                </div>
              </div>

              <div className="detail-card-body" style={{ padding: "1.5rem" }}>
                <div className="applicant-ai-pipeline-steps">
                  <div className="applicant-step-item">
                    <div className="applicant-step-badge">1</div>
                    <div>
                      <strong>Intake & Instant Tracking ID</strong>
                      <p>Your grievance is logged and assigned a unique Tracking ID.</p>
                    </div>
                  </div>

                  <div className="applicant-step-item">
                    <div className="applicant-step-badge">2</div>
                    <div>
                      <strong>BERT Natural Language Classification</strong>
                      <p>AI scans and extracts category, priority, and department routing.</p>
                    </div>
                  </div>

                  <div className="applicant-step-item">
                    <div className="applicant-step-badge">3</div>
                    <div>
                      <strong>Central Review & Officer Assignment</strong>
                      <p>Manager validates classification and dispatches to Assistant Dean.</p>
                    </div>
                  </div>

                  <div className="applicant-step-item">
                    <div className="applicant-step-badge">4</div>
                    <div>
                      <strong>Resolution & Formal Closure</strong>
                      <p>Authority takes action, uploads resolution proofs, and concludes case.</p>
                    </div>
                  </div>
                </div>

                <div className="ai-advisory-box" style={{ marginTop: "20px" }}>
                  <span className="ai-advisory-bullet">•</span>
                  <div>
                    <strong>Confidentiality Notice</strong>
                    <p>All grievance records are securely handled according to CSJMU university grievance redressal statutes.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SubmitGrievance;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FilePlus,
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ClipboardList,
  FolderOpen,
  UserCheck,
  FileCheck,
  LayoutDashboard,
  ListOrdered,
  Info,
  X,
  Lock,
} from "lucide-react";

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
      setError("Grievance title must contain at least 5 characters.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Detailed description must contain at least 20 characters.");
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
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: "Submit Grievance", path: "/dashboard/submit", icon: <FilePlus size={16} />, active: true },
    { label: "My Grievances", path: "/dashboard/grievances", icon: <ListOrdered size={16} /> },
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
          {/* COMPACT BREADCRUMB */}
          <div className="detail-navigation-bar">
            <Link to="/dashboard/grievances" className="detail-back-link">
              <ArrowLeft size={15} />
              <span>Back to My Grievances</span>
            </Link>
          </div>

          {/* PAGE HEADER */}
          <header className="detail-page-header submit-page-header">
            <div className="detail-header-main">
              <div className="detail-header-meta-row">
                <span className="submit-eyebrow-badge">GRIEVANCE REGISTRATION</span>
                <span className="meta-divider">•</span>
                <span className="submit-meta-note">CSJMU Redressal Portal</span>
              </div>
              <h1 className="detail-case-title">Submit a Grievance</h1>
              <p className="submit-header-description">
                Submit your concern with relevant details and supporting documents. Your grievance will be securely registered, reviewed, and routed to the appropriate university authority.
              </p>
            </div>
          </header>

          {/* NOTIFICATION MESSAGES */}
          {statusMessage && (
            <div className="authority-doc-success-msg" style={{ marginBottom: "20px" }}>
              <CheckCircle2 size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="dashboard-error" style={{ marginBottom: "20px" }}>
              <AlertCircle size={16} />
              <p>{error}</p>
            </div>
          )}

          {/* 2-COLUMN GRID (FORM 65% + PROCESS/INFO 35%) */}
          <div className="detail-top-grid submit-layout-grid">
            {/* LEFT: SUBMISSION FORM CARD */}
            <section className="detail-card submit-form-card">
              <div className="detail-card-header">
                <div className="detail-card-title-wrap">
                  <FilePlus size={18} className="text-slate-700" />
                  <div>
                    <h2>Grievance Details & Evidence</h2>
                    <p>Official complaint registration form</p>
                  </div>
                </div>
                <span className="form-required-pill">
                  <span className="required-star">*</span> Required fields
                </span>
              </div>

              <form onSubmit={handleSubmit} className="submit-grievance-form">
                {/* SECTION 1: PARTICULARS */}
                <div className="form-section-block">
                  <div className="form-section-header">
                    <span className="form-section-number">01</span>
                    <div>
                      <h3 className="form-section-title">Grievance Particulars</h3>
                      <p className="form-section-subtitle">Specify the subject and detailed explanation of your concern</p>
                    </div>
                  </div>

                  <div className="form-group submit-form-group">
                    <label htmlFor="title" className="submit-field-label">
                      Grievance Title / Subject <span className="field-required-mark">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g., Discrepancy in Semester 4 Grade Card Marks or Fellowship Disbursal Delay"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={loading}
                      required
                      className="form-control submit-input"
                    />
                    <span className="submit-helper-text">
                      Briefly describe the issue in a few words (minimum 5 characters).
                    </span>
                  </div>

                  <div className="form-group submit-form-group">
                    <label htmlFor="description" className="submit-field-label">
                      Detailed Description <span className="field-required-mark">*</span>
                    </label>
                    <textarea
                      id="description"
                      rows={6}
                      placeholder="Provide comprehensive details regarding your grievance, including registration/roll number, relevant dates, previous communication, and specific redressal requested..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                      required
                      className="form-control submit-textarea"
                    />
                    <span className="submit-helper-text">
                      Include relevant dates, academic details, previous communication, and any information that may help the authority review your case (minimum 20 characters).
                    </span>
                  </div>
                </div>

                {/* SECTION 2: SUPPORTING DOCUMENTS */}
                <div className="form-section-block">
                  <div className="form-section-header">
                    <span className="form-section-number">02</span>
                    <div>
                      <h3 className="form-section-title">Supporting Documents</h3>
                      <p className="form-section-subtitle">Attach official letters, receipts, marksheets, or evidence</p>
                    </div>
                  </div>

                  <div className="form-group submit-form-group">
                    <div className="submit-dropzone-container">
                      <input
                        id="applicant-file-input"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                        onChange={handleFileChange}
                        disabled={loading}
                        style={{ display: "none" }}
                      />
                      <label htmlFor="applicant-file-input" className="submit-dropzone-label">
                        <div className="dropzone-icon-circle">
                          <Upload size={22} className="text-slate-600" />
                        </div>
                        <div className="dropzone-text-block">
                          <strong className="dropzone-main-text">
                            Click to browse files <span className="text-slate-500 font-normal">or drag and drop</span>
                          </strong>
                          <p className="dropzone-sub-text">
                            Supported formats: PDF, PNG, JPG, DOCX, TXT • Max 20MB per file
                          </p>
                        </div>
                        <button
                          type="button"
                          className="browse-files-btn"
                          onClick={() => document.getElementById("applicant-file-input")?.click()}
                          disabled={loading}
                        >
                          <Paperclip size={13} />
                          <span>Browse Files</span>
                        </button>
                      </label>
                    </div>

                    {/* SELECTED FILES LIST */}
                    {files.length > 0 && (
                      <div className="submit-selected-files-list">
                        <span className="selected-files-header-label">
                          Selected Attachments ({files.length}):
                        </span>
                        {files.map((file, idx) => (
                          <div key={idx} className="submit-file-item-card">
                            <div className="submit-file-info-group">
                              <div className="submit-file-icon-box">
                                <FileText size={16} className="text-slate-600" />
                              </div>
                              <div className="submit-file-meta-block">
                                <strong className="submit-file-name">{file.name}</strong>
                                <span className="submit-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="submit-file-remove-btn"
                              title="Remove file"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="submit-form-actions-row">
                  <Link to="/dashboard/grievances" className="submit-cancel-btn">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="submit-primary-btn"
                    disabled={loading || !title.trim() || !description.trim()}
                  >
                    <Send size={15} />
                    <span>{loading ? "Registering Grievance..." : "Submit Grievance"}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* RIGHT: WHAT HAPPENS NEXT & SECURITY INFORMATION PANEL */}
            <div className="submit-side-panel">
              {/* WHAT HAPPENS NEXT */}
              <section className="detail-card submit-process-card">
                <div className="detail-card-header">
                  <div className="detail-card-title-wrap">
                    <ClipboardList size={18} className="text-slate-700" />
                    <div>
                      <h2>What Happens Next?</h2>
                      <p>Institutional Redressal Workflow</p>
                    </div>
                  </div>
                </div>

                <div className="detail-card-body submit-process-body">
                  <div className="institutional-step-list">
                    <div className="institutional-step-item">
                      <div className="step-icon-wrap">
                        <ClipboardList size={16} />
                      </div>
                      <div className="step-content-wrap">
                        <strong className="step-title">1. Grievance Registered</strong>
                        <p className="step-desc">
                          Your submission is securely logged and assigned a unique tracking ID (e.g. GRV-XXXXX).
                        </p>
                      </div>
                    </div>

                    <div className="institutional-step-item">
                      <div className="step-icon-wrap">
                        <FolderOpen size={16} />
                      </div>
                      <div className="step-content-wrap">
                        <strong className="step-title">2. Case Review & Routing</strong>
                        <p className="step-desc">
                          Your grievance is categorized and routed to the appropriate university authority.
                        </p>
                      </div>
                    </div>

                    <div className="institutional-step-item">
                      <div className="step-icon-wrap">
                        <UserCheck size={16} />
                      </div>
                      <div className="step-content-wrap">
                        <strong className="step-title">3. Authority Examination</strong>
                        <p className="step-desc">
                          The designated authority reviews your case and may request additional supporting evidence if required.
                        </p>
                      </div>
                    </div>

                    <div className="institutional-step-item">
                      <div className="step-icon-wrap">
                        <FileCheck size={16} />
                      </div>
                      <div className="step-content-wrap">
                        <strong className="step-title">4. Resolution & Formal Closure</strong>
                        <p className="step-desc">
                          Official redressal notes are recorded and you are notified upon resolution and final verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CONFIDENTIALITY & SECURITY NOTICE */}
              <section className="detail-card submit-security-card">
                <div className="security-notice-body">
                  <div className="security-icon-circle">
                    <ShieldCheck size={20} className="text-emerald-700" />
                  </div>
                  <div className="security-text-wrap">
                    <h4 className="security-title">Your Information Is Protected</h4>
                    <p className="security-desc">
                      Your grievance details and supporting documents are handled with strict institutional confidentiality and are accessible only to authorized university personnel involved in the redressal process.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SubmitGrievance;
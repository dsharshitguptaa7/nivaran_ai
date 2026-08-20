export default function ApplicantInfoCard({ applicant, className = "" }) {
  const name = applicant?.full_name || "CSJMU Applicant";
  const phdRegNo = applicant?.phd_registration_number || "Not Registered";
  const subjectName = applicant?.subject_name || "Not Specified";
  const email = applicant?.email || "—";
  const department = applicant?.department;

  return (
    <section className={`detail-card authority-applicant-card ${className}`}>
      <div className="detail-card-header">
        <div className="detail-card-title-wrap">
          <span className="applicant-card-icon">👤</span>
          <div>
            <h2>Applicant Information</h2>
            <p>Research scholar credentials and academic identity</p>
          </div>
        </div>
        {applicant?.phd_registration_number ? (
          <span className="applicant-verified-badge" title="Verified PhD Scholar">
            ✓ PhD SCHOLAR
          </span>
        ) : (
          <span className="applicant-unverified-badge">GENERAL APPLICANT</span>
        )}
      </div>

      <div className="detail-card-body" style={{ padding: "1.5rem" }}>
        <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px 20px" }}>
          <div className="detail-field">
            <span>FULL NAME</span>
            <strong style={{ fontSize: "15px", color: "var(--text-primary, #0f172a)" }}>{name}</strong>
          </div>

          <div className="detail-field">
            <span>PHD REGISTRATION NUMBER</span>
            <div>
              {applicant?.phd_registration_number ? (
                <span className="phd-reg-pill">
                  🪪 {phdRegNo}
                </span>
              ) : (
                <span style={{ color: "var(--text-muted, #94a3b8)", fontSize: "13px" }}>
                  Not Registered
                </span>
              )}
            </div>
          </div>

          <div className="detail-field">
            <span>RESEARCH SUBJECT</span>
            <strong style={{ color: "var(--primary, #70162a)" }}>📚 {subjectName}</strong>
          </div>

          {email && email !== "—" && (
            <div className="detail-field">
              <span>EMAIL ADDRESS</span>
              <span style={{ fontSize: "13px", color: "var(--text-secondary, #475569)" }}>✉️ {email}</span>
            </div>
          )}

          {department && (
            <div className="detail-field">
              <span>DEPARTMENT / FACULTY</span>
              <strong>{department}</strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

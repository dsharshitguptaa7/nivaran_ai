import React from "react";
import { User, GraduationCap, BookOpen, Mail, Building2, BadgeCheck } from "lucide-react";

export default function ApplicantInfoCard({ applicant, className = "" }) {
  const name = applicant?.full_name || "CSJMU Applicant";
  const phdRegNo = applicant?.phd_registration_number || "Not Registered";
  const subjectName = applicant?.subject_name || "Not Specified";
  const email = applicant?.email || "—";
  const department = applicant?.department;

  return (
    <section className={`detail-card authority-applicant-card ${className}`}>
      {/* CARD HEADER */}
      <div className="detail-card-header">
        <div className="detail-card-title-wrap">
          <User size={18} className="text-slate-700" />
          <div>
            <h2>Applicant Information</h2>
            <p>Research scholar credentials and academic identity</p>
          </div>
        </div>
        {applicant?.phd_registration_number ? (
          <span className="applicant-verified-badge" title="Verified PhD Scholar">
            <BadgeCheck size={13} className="text-emerald-700" />
            <span>PhD SCHOLAR</span>
          </span>
        ) : (
          <span className="applicant-unverified-badge">GENERAL APPLICANT</span>
        )}
      </div>

      {/* CARD BODY */}
      <div className="detail-card-body">
        <div className="detail-grid applicant-info-grid">
          {/* Full Name */}
          <div className="detail-field">
            <span className="detail-field-label">FULL NAME</span>
            <strong className="detail-field-value text-slate-900">{name}</strong>
          </div>

          {/* PhD Registration Number */}
          <div className="detail-field">
            <span className="detail-field-label">PHD REGISTRATION NUMBER</span>
            <div>
              {applicant?.phd_registration_number ? (
                <span className="phd-reg-pill font-mono">
                  <GraduationCap size={12} />
                  <span>{phdRegNo}</span>
                </span>
              ) : (
                <span className="text-slate-400 text-xs font-medium">
                  Not Registered
                </span>
              )}
            </div>
          </div>

          {/* Research Subject */}
          <div className="detail-field">
            <span className="detail-field-label">RESEARCH SUBJECT</span>
            <div className="flex-val-row">
              <BookOpen size={13} className="text-slate-500" />
              <strong className="detail-field-value text-slate-800">{subjectName}</strong>
            </div>
          </div>

          {/* Email */}
          {email && email !== "—" && (
            <div className="detail-field">
              <span className="detail-field-label">EMAIL ADDRESS</span>
              <div className="flex-val-row">
                <Mail size={13} className="text-slate-500" />
                <a
                  href={`mailto:${email}`}
                  className="applicant-email-link text-xs"
                  title={`Email ${name}`}
                >
                  {email}
                </a>
              </div>
            </div>
          )}

          {/* Department */}
          {department && (
            <div className="detail-field">
              <span className="detail-field-label">DEPARTMENT / FACULTY</span>
              <div className="flex-val-row">
                <Building2 size={13} className="text-slate-500" />
                <strong className="detail-field-value text-slate-800">{department}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


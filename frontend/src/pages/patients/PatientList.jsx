import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiUserPlus, FiTrash2, FiUsers, FiSearch, FiX, FiAlertTriangle, FiChevronRight } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import RiskBadge from "../../components/patients/RiskBadge.jsx";
import usePatientsWithRisk, { sepsisLevel } from "../../hooks/usePatientsWithRisk.js";
import * as patientApi from "../../api/patientApi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./PatientList.module.css";

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "high",     label: "High risk" },
  { key: "moderate", label: "Moderate" },
  { key: "low",      label: "Low" },
  { key: "none",     label: "Not assessed" },
];

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

function matchesFilter(patient, filter) {
  if (filter === "all") return true;
  const level = sepsisLevel(patient);
  return filter === "none" ? level === null : level === filter;
}

export default function PatientList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [filter, setFilter] = useState("all");
  const { patients, loading, error, reload } = usePatientsWithRisk();
  const { showToast } = useToast();

  // Keep in sync with the global top-bar search, which navigates here with ?q=.
  useEffect(() => { setSearch(searchParams.get("q") || ""); }, [searchParams]);

  function updateSearch(value) {
    setSearch(value);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  }

  const term = search.trim().toLowerCase();
  const visible = patients.filter((p) =>
    matchesFilter(p, filter) &&
    (!term || p.fullName.toLowerCase().includes(term) || (p.location || "").toLowerCase().includes(term))
  );

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete ${name} and all their records? This cannot be undone.`)) return;
    try {
      await patientApi.deletePatient(id);
      reload();
      showToast(`${name} was deleted.`, { type: "success" });
    } catch {
      showToast("Could not delete patient.", { type: "error" });
    }
  }

  const countLabel = loading
    ? "Loading patients…"
    : `${patients.length} patient${patients.length !== 1 ? "s" : ""} in your care`;

  return (
    <AppLayout>
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Patients" }]}
        title="Patients"
        subtitle={countLabel}
        actions={<Button to="/patients/new" icon={<FiUserPlus size={15} />}>Register patient</Button>}
      />

      {error && (
        <div className={styles.error} role="alert">
          <FiAlertTriangle size={16} /> {error}
        </div>
      )}

      <div className={styles.panel}>
        {/* ── Toolbar ─────────────────────────────────────── */}
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <FiSearch size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              aria-label="Search patients"
            />
            {search && (
              <button className={styles.searchClear} onClick={() => updateSearch("")} aria-label="Clear search">
                <FiX size={15} />
              </button>
            )}
          </div>

          <div className={styles.filters} role="group" aria-label="Filter by sepsis risk">
            {FILTERS.map(({ key, label }) => {
              const count = key === "all" ? patients.length : patients.filter((p) => matchesFilter(p, key)).length;
              return (
                <button
                  key={key}
                  className={`${styles.filterChip} ${filter === key ? styles.filterChipActive : ""}`}
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                >
                  {label}
                  {!loading && <span className={styles.chipCount}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────── */}
        {loading && (
          <div className={styles.skeletonList}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton circle width="34px" height="34px" />
                <Skeleton width="35%" height="0.95rem" />
                <Skeleton width="15%" height="0.95rem" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty states ────────────────────────────────── */}
        {!loading && patients.length === 0 && !error && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><FiUsers size={26} /></span>
            <p className={styles.emptyTitle}>No patients yet</p>
            <p className={styles.emptyHint}>Register your first patient to begin their onboarding assessment.</p>
            <Button to="/patients/new" icon={<FiUserPlus size={15} />}>Register patient</Button>
          </div>
        )}

        {!loading && patients.length > 0 && visible.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><FiSearch size={24} /></span>
            <p className={styles.emptyTitle}>No matching patients</p>
            <p className={styles.emptyHint}>Try a different name, or clear the search and filters.</p>
            <Button variant="secondary" onClick={() => { updateSearch(""); setFilter("all"); }}>
              Clear search &amp; filters
            </Button>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────── */}
        {!loading && visible.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th className={styles.colMd}>Age / Gender</th>
                  <th className={styles.colLg}>Relationship</th>
                  <th>Sepsis risk</th>
                  <th className={styles.colMd}>Last assessed</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/patients/${p.id}`} className={styles.patientCell}>
                        <Avatar name={p.fullName} size="sm" />
                        <span className={styles.patientText}>
                          <span className={styles.patientName}>
                            {p.fullName}
                            {p.risk?.referral_recommended && (
                              <span className={styles.referralFlag} title="Referral recommended">
                                <FiAlertTriangle size={12} /> Referral
                              </span>
                            )}
                          </span>
                          <span className={styles.patientSub}>
                            {[p.location, `${p.age} yrs`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${styles.colMd} ${styles.muted}`}>{p.age} · {p.gender}</td>
                    <td className={`${styles.colLg} ${styles.muted}`}>{p.relationshipToCaregiver}</td>
                    <td><RiskBadge level={sepsisLevel(p)} /></td>
                    <td className={`${styles.colMd} ${styles.muted}`}>{formatDate(p.assessedAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(p.id, p.fullName)}
                          aria-label={`Delete ${p.fullName}`}
                          title="Delete patient"
                        >
                          <FiTrash2 size={15} />
                        </button>
                        <Link to={`/patients/${p.id}`} className={styles.openBtn} aria-label={`Open ${p.fullName}`}>
                          <span>Open</span>
                          <FiChevronRight size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

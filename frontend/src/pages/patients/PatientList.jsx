import { useState } from "react";
import { Link } from "react-router-dom";
import { FiUserPlus, FiTrash2, FiUser, FiSearch, FiX, FiChevronRight } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Button from "../../components/common/Button.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import RiskBadge from "../../components/patients/RiskBadge.jsx";
import usePatientsWithRisk, { sepsisLevel } from "../../hooks/usePatientsWithRisk.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import * as patientApi from "../../api/patientApi";
import styles from "./PatientList.module.css";

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "high",     label: "High risk" },
  { key: "moderate", label: "Moderate" },
  { key: "low",      label: "Low" },
  { key: "none",     label: "Not assessed" },
];

function matchesFilter(patient, filter) {
  if (filter === "all") return true;
  const level = sepsisLevel(patient);
  return filter === "none" ? level === null : level === filter;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;
}

export default function PatientList() {
  const { patients, setPatients, loading, error } = usePatientsWithRisk();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function handleDelete(id, name) {
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: "This permanently removes the patient and all their assessments, conversations and guides. This cannot be undone.",
      confirmLabel: "Delete patient",
      danger: true,
    });
    if (!ok) return;
    try {
      await patientApi.deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      showToast(`${name} was deleted.`);
    } catch {
      showToast(`Could not delete ${name}. Please try again.`, { type: "error" });
    }
  }

  const term = search.trim().toLowerCase();
  const visible = patients.filter((p) =>
    matchesFilter(p, filter) &&
    (!term || p.fullName.toLowerCase().includes(term) || (p.location || "").toLowerCase().includes(term))
  );

  const countLabel = loading
    ? "Loading…"
    : `${patients.length} patient${patients.length !== 1 ? "s" : ""} in your care`;

  return (
    <AppLayout>
      <PageHeader
        title="Patients"
        subtitle={countLabel}
        actions={<Button to="/patients/new" icon={<FiUserPlus />}>Add patient</Button>}
      />

      {loading && <div className={styles.center}><HeartbeatLoader label="Loading patients…" /></div>}
      {error   && <p className={styles.error} role="alert">{error}</p>}

      {!loading && !error && patients.length === 0 && (
        <EmptyState
          icon={<FiUser />}
          title="No patients yet"
          action={<Button to="/patients/new" icon={<FiUserPlus />}>Add your first patient</Button>}
        >
          Add a patient to begin onboarding and get a personalised sepsis risk assessment.
        </EmptyState>
      )}

      {!loading && patients.length > 0 && (
        <>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <FiSearch size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location"
                aria-label="Search patients"
              />
              {search && (
                <button type="button" className={styles.clearSearch} onClick={() => setSearch("")} aria-label="Clear search">
                  <FiX size={15} />
                </button>
              )}
            </label>

            <div className={styles.filters} role="group" aria-label="Filter by sepsis risk">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.filterChip} ${filter === key ? styles.filterChipActive : ""}`}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span className={styles.filterCount}>{patients.filter((p) => matchesFilter(p, key)).length}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className={styles.noMatch}>
              No patients match{term ? ` “${search.trim()}”` : ""}{filter !== "all" ? " with this filter" : ""}.
            </p>
          ) : (
            <ul className={styles.patientGrid}>
              {visible.map((patient) => {
                const assessed = formatDate(patient.assessedAt);
                return (
                  <li key={patient.id} className={styles.patientCard}>
                    <Link to={`/patients/${patient.id}`} className={styles.patientLink}>
                      <Avatar name={patient.fullName} />
                      <div className={styles.patientInfo}>
                        <h3 className={styles.patientName}>{patient.fullName}</h3>
                        <p className={styles.patientMeta}>
                          {patient.age} yrs &middot; {patient.gender} &middot; {patient.relationshipToCaregiver}
                          {patient.location && <> &middot; {patient.location}</>}
                        </p>
                        <p className={styles.patientMeta}>
                          {assessed ? `Last assessed ${assessed}` : "No assessment yet"}
                        </p>
                      </div>
                      <RiskBadge level={sepsisLevel(patient)} prefix="Sepsis" />
                      <FiChevronRight size={18} className={styles.chevron} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(patient.id, patient.fullName)}
                      aria-label={`Delete ${patient.fullName}`}
                      title="Delete patient"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUserPlus, FiEye, FiTrash2, FiUser, FiSearch, FiX } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Button from "../../components/common/Button.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import * as patientApi from "../../api/patientApi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./PatientList.module.css";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();

  const filteredPatients = patients.filter((p) =>
    p.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );

  function loadPatients() {
    setLoading(true);
    patientApi
      .listPatients()
      .then(({ data }) => setPatients(data.patients))
      .catch(() => setError("Could not load patients."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPatients(); }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete ${name} and all their records? This cannot be undone.`)) return;
    try {
      await patientApi.deletePatient(id);
      loadPatients();
      showToast(`${name} was deleted.`, { type: "success" });
    } catch {
      setError("Could not delete patient.");
      showToast("Could not delete patient.", { type: "error" });
    }
  }

  return (
    <AppLayout>
      <div className={styles.headerRow}>
        <div>
          <h1>Patients</h1>
          {!loading && (
            <p className={styles.count}>
              {search
                ? `${filteredPatients.length} of ${patients.length} patient${patients.length !== 1 ? "s" : ""}`
                : `${patients.length} patient${patients.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <Button onClick={() => navigate("/patients/new")} icon={<FiUserPlus />}>
          Add Patient
        </Button>
      </div>

      {!loading && patients.length > 0 && (
        <div className={styles.searchBar}>
          <FiSearch size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search patients by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patients"
          />
          {search && (
            <button
              className={styles.searchClear}
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className={styles.patientGrid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.patientCard}>
              <Skeleton circle width="38px" height="38px" />
              <div className={styles.patientInfo}>
                <Skeleton width="45%" height="1rem" />
                <Skeleton width="65%" height="0.8rem" className={styles.skeletonGap} />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && patients.length === 0 && (
        <div className={styles.empty}>
          <FiUser size={40} className={styles.emptyIcon} />
          <p>No patients yet.</p>
          <p className={styles.emptyHint}>Add your first patient to begin the onboarding process.</p>
          <Button onClick={() => navigate("/patients/new")} icon={<FiUserPlus />}>
            Add first patient
          </Button>
        </div>
      )}

      {!loading && patients.length > 0 && filteredPatients.length === 0 && (
        <div className={styles.empty}>
          <FiSearch size={40} className={styles.emptyIcon} />
          <p>No patients match "{search}".</p>
          <p className={styles.emptyHint}>Try a different name, or clear the search.</p>
        </div>
      )}

      <div className={styles.patientGrid}>
        {filteredPatients.map((patient) => (
          <div key={patient.id} className={styles.patientCard}>
            <Avatar name={patient.fullName} size="sm" />
            <div className={styles.patientInfo}>
              <h3 className={styles.patientName}>{patient.fullName}</h3>
              <p className={styles.patientMeta}>
                Age {patient.age} &middot; {patient.gender} &middot; {patient.relationshipToCaregiver}
              </p>
            </div>
            <div className={styles.patientActions}>
              <Link to={`/patients/${patient.id}`} className={styles.viewBtn} aria-label={`View ${patient.fullName}`}>
                <FiEye size={16} />
                <span>View</span>
              </Link>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(patient.id, patient.fullName)}
                aria-label={`Delete ${patient.fullName}`}
              >
                <FiTrash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

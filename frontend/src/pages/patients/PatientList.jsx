import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUserPlus, FiEye, FiTrash2, FiUser } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import * as patientApi from "../../api/patientApi";
import styles from "./PatientList.module.css";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const navigate = useNavigate();

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
    } catch {
      setError("Could not delete patient.");
    }
  }

  return (
    <AppLayout>
      <div className={styles.headerRow}>
        <div>
          <h1>Patients</h1>
          {!loading && <p className={styles.count}>{patients.length} patient{patients.length !== 1 ? "s" : ""}</p>}
        </div>
        <Button onClick={() => navigate("/patients/new")} icon={<FiUserPlus />}>
          Add Patient
        </Button>
      </div>

      {loading && <div className={styles.center}><Spinner size="lg" /></div>}
      {error   && <p className={styles.error}>{error}</p>}

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

      <div className={styles.patientGrid}>
        {patients.map((patient) => (
          <div key={patient.id} className={styles.patientCard}>
            <div className={styles.patientAvatar}>
              <FiUser size={22} />
            </div>
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiUser, FiUserPlus } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import * as patientApi from "../../api/patientApi";
import styles from "./MicrolearningHome.module.css";

export default function MicrolearningHome() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    patientApi.listPatients()
      .then(({ data }) => setPatients(data.patients))
      .catch(() => setError("Could not load your patients."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Microlearning">
      <PageHeader
        icon={<FiBookOpen />}
        eyebrow="Patient-specific learning"
        title="Microlearning"
        subtitle="Open the AI-generated care materials for one of your patients."
      />

      {loading && <HeartbeatLoader label="Loading patients…" />}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!loading && !error && patients.length === 0 && (
        <EmptyState
          icon={<FiUser />}
          title="No patients yet"
          action={<Button to="/patients/new" icon={<FiUserPlus />}>Add a patient</Button>}
        >
          Add a patient and complete onboarding to generate patient-specific microlearning guides.
        </EmptyState>
      )}

      {!loading && patients.length > 0 && (
        <ul className={styles.grid}>
          {patients.map((patient) => (
            <li key={patient.id}>
              <Link to={`/patients/${patient.id}/microlearning`} className={styles.card}>
                <Avatar name={patient.fullName} />
                <div className={styles.patientInfo}>
                  <h2>{patient.fullName}</h2>
                  <p>{patient.age} years · {patient.gender}</p>
                </div>
                <span className={styles.open}>Open guides <FiArrowRight aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

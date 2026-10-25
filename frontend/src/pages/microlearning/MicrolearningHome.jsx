import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiUser } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
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
    <AppLayout>
      <header className={styles.header}><div className={styles.icon}><FiBookOpen size={23} /></div><div><p className={styles.eyebrow}>Patient-specific learning</p><h1>Microlearning</h1><p>Open the AI-generated care materials for one of your patients.</p></div></header>
      {loading && <div className={styles.center}><Spinner size="lg" /></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && patients.length === 0 && <div className={styles.empty}><FiUser size={32} /><h2>No patients yet</h2><p>Add a patient and complete onboarding to generate patient-specific microlearning guides.</p><Link to="/patients/new">Add a patient <FiArrowRight /></Link></div>}
      {!loading && patients.length > 0 && <div className={styles.grid}>{patients.map((patient) => <article className={styles.card} key={patient.id}><div className={styles.avatar}><FiUser size={20} /></div><div className={styles.patientInfo}><h2>{patient.fullName}</h2><p>{patient.age} years · {patient.gender}</p></div><Link to={`/patients/${patient.id}/microlearning`} aria-label={`Open ${patient.fullName} microlearning`}><span>Open guides</span><FiArrowRight /></Link></article>)}</div>}
    </AppLayout>
  );
}

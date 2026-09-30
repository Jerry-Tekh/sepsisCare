import { RiAlertFill, RiHospitalLine, RiPhoneLine } from "react-icons/ri";
import { FiArrowLeft } from "react-icons/fi";
import styles from "./ReferralAlert.module.css";

export default function ReferralAlert({ patientName, referralReason, onBack }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {/* Pulsing icon */}
        <div className={styles.iconWrap}>
          <RiAlertFill size={52} className={styles.icon} />
        </div>

        <h1 className={styles.title}>Red Flag Detected</h1>
        <p className={styles.patientName}>{patientName}</p>

        <div className={styles.reasonBox}>
          <p className={styles.reasonLabel}>Reason for referral:</p>
          <p className={styles.reasonText}>{referralReason}</p>
        </div>

        <div className={styles.actions}>
          <div className={styles.actionCard}>
            <RiHospitalLine size={28} className={styles.actionIcon} />
            <div>
              <p className={styles.actionTitle}>Go to the nearest clinic or hospital immediately</p>
              <p className={styles.actionSub}>Do not wait — take the patient now</p>
            </div>
          </div>
          <div className={styles.actionCard}>
            <RiPhoneLine size={28} className={styles.actionIcon} />
            <div>
              <p className={styles.actionTitle}>Call your clinical supervisor</p>
              <p className={styles.actionSub}>Inform them of the situation while travelling</p>
            </div>
          </div>
        </div>

        <p className={styles.disclaimer}>
          Home care must STOP until the patient is evaluated by a clinician.
        </p>

        <button className={styles.backBtn} onClick={onBack}>
          <FiArrowLeft size={15} />
          Back to patient profile
        </button>
      </div>
    </div>
  );
}

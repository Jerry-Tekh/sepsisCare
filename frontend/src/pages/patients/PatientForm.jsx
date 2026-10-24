import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiUser, FiCalendar, FiMapPin, FiHeart, FiSave } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import * as patientApi from "../../api/patientApi";
import { useToast } from "../../context/ToastContext.jsx";
import styles from "./PatientForm.module.css";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];

const EMPTY_FORM = {
  fullName: "",
  age: "",
  gender: "",
  location: "",
  relationshipToCaregiver: "",
};

export default function PatientForm() {
  const { id }     = useParams();
  const isEditing  = Boolean(id);
  const navigate   = useNavigate();

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(isEditing);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isEditing) return;
    patientApi
      .getPatient(id)
      .then(({ data }) => {
        const p = data.patient;
        setForm({
          fullName:               p.fullName,
          age:                    String(p.age),
          gender:                 p.gender,
          location:               p.location || "",
          relationshipToCaregiver: p.relationshipToCaregiver,
        });
      })
      .catch(() => setError("Could not load patient details."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, age: Number(form.age) };
      if (isEditing) {
        await patientApi.updatePatient(id, payload);
        showToast("Patient details updated.", { type: "success" });
        navigate(`/patients/${id}`);
      } else {
        const { data } = await patientApi.createPatient(payload);
        showToast(`${data.patient.fullName} was added.`, { type: "success" });
        navigate(`/patients/${data.patient.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not save patient.");
    } finally {
      setSubmitting(false);
    }
  }

  const crumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Patients", to: "/patients" },
    ...(isEditing
      ? [{ label: form.fullName || "Patient", to: `/patients/${id}` }, { label: "Edit details" }]
      : [{ label: "Register patient" }]),
  ];

  if (loading) {
    return (
      <AppLayout>
        <PageHeader breadcrumbs={crumbs} title="Edit patient details" />
        <div className={styles.center}><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        breadcrumbs={crumbs}
        title={isEditing ? "Edit patient details" : "Register a new patient"}
        subtitle={
          isEditing
            ? "Update the patient's information below."
            : "Enter the patient's details. You can start their onboarding assessment straight after."
        }
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <Card title="Personal information" icon={<FiUser />}>
          <div className={styles.fieldGrid}>
            <div className={styles.spanFull}>
              <Input
                label="Full name"
                type="text"
                value={form.fullName}
                onChange={handleChange("fullName")}
                placeholder="Patient's full name"
                autoComplete="off"
                required
                icon={<FiUser />}
              />
            </div>

            <Input
              label="Age"
              type="number"
              min="0"
              max="130"
              value={form.age}
              onChange={handleChange("age")}
              placeholder="Age in years"
              required
              icon={<FiCalendar />}
            />

            {/* Gender — controlled select so values are consistent */}
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="patient-gender">Gender <span className={styles.required}>*</span></label>
              <select
                id="patient-gender"
                className={styles.select}
                value={form.gender}
                onChange={handleChange("gender")}
                required
              >
                <option value="" disabled>Select gender…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Care context" icon={<FiHeart />}>
          <div className={styles.fieldGrid}>
            <Input
              label="Relationship to caregiver"
              type="text"
              value={form.relationshipToCaregiver}
              onChange={handleChange("relationshipToCaregiver")}
              placeholder="e.g. Daughter, Spouse, Professional caregiver"
              autoComplete="off"
              required
              icon={<FiHeart />}
            />

            <Input
              label="Location (optional)"
              type="text"
              value={form.location}
              onChange={handleChange("location")}
              placeholder="City, town, or area"
              autoComplete="off"
              icon={<FiMapPin />}
            />
          </div>
        </Card>

        {error && (
          <div className={styles.errorBox} role="alert">{error}</div>
        )}

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEditing ? `/patients/${id}` : "/patients")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            icon={<FiSave size={15} />}
          >
            {submitting ? "Saving…" : isEditing ? "Save changes" : "Register patient"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

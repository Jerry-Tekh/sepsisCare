import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiUser, FiCalendar, FiMapPin, FiHeart, FiSave, FiInfo } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { apiErrorMessage, fieldErrors } from "../../api/errors.js";
import * as patientApi from "../../api/patientApi";
import styles from "./PatientForm.module.css";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];

// Quick picks for the free-text relationship field; any value is still allowed.
const RELATIONSHIP_SUGGESTIONS = ["Parent", "Spouse / partner", "Child", "Sibling", "Grandparent", "Friend", "Professional caregiver"];

const EMPTY_FORM = {
  fullName: "",
  age: "",
  gender: "",
  location: "",
  relationshipToCaregiver: "",
};

// Mirrors the backend's patient schema so mistakes are caught before submitting.
function validate(form) {
  const errors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Enter the patient's full name (at least 2 characters).";
  const age = Number(form.age);
  if (form.age === "" || !Number.isInteger(age) || age < 0 || age > 130) errors.age = "Enter an age in whole years, between 0 and 130.";
  if (!form.gender) errors.gender = "Choose an option.";
  if (!form.relationshipToCaregiver.trim()) errors.relationshipToCaregiver = "Tell us how you're related to the patient.";
  return errors;
}

export default function PatientForm() {
  const { id }     = useParams();
  const isEditing  = Boolean(id);
  const navigate   = useNavigate();
  const { showToast } = useToast();

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(isEditing);

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

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleChange(field) {
    return (e) => setField(field, e.target.value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const payload = { ...form, fullName: form.fullName.trim(), age: Number(form.age) };
      if (isEditing) {
        await patientApi.updatePatient(id, payload);
        showToast("Patient details saved.");
        navigate(`/patients/${id}`);
      } else {
        const { data } = await patientApi.createPatient(payload);
        showToast(`${payload.fullName} was added. Start onboarding when you're ready.`);
        navigate(`/patients/${data.patient.id}`);
      }
    } catch (err) {
      const serverErrors = fieldErrors(err);
      setErrors(serverErrors);
      if (!Object.keys(serverErrors).length) setError(apiErrorMessage(err, "Could not save patient."));
    } finally {
      setSubmitting(false);
    }
  }

  const title = isEditing ? "Edit patient" : "Add patient";
  const back = isEditing ? { to: `/patients/${id}`, label: "Back to patient" } : { to: "/patients", label: "All patients" };

  if (loading) {
    return (
      <AppLayout title={title}>
        <HeartbeatLoader label="Loading patient details…" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={title}>
      <PageHeader
        back={back}
        title={isEditing ? "Edit patient" : "Add a patient"}
        subtitle={isEditing
          ? "Update the patient's information below."
          : "Tell us about the person you care for. You can change these details later."}
      />

      <div className={styles.layout}>
        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <fieldset className={styles.section}>
              <legend className={styles.sectionTitle}>About the patient</legend>

              <Input
                label="Full name"
                type="text"
                value={form.fullName}
                onChange={handleChange("fullName")}
                placeholder="Patient's full name"
                autoComplete="off"
                required
                icon={<FiUser />}
                error={errors.fullName}
              />

              <div className={styles.row}>
                <Input
                  label="Age"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="130"
                  value={form.age}
                  onChange={handleChange("age")}
                  placeholder="Years"
                  required
                  icon={<FiCalendar />}
                  suffix={<span className={styles.unit}>yrs</span>}
                  error={errors.age}
                />

                <Input
                  label="Location (optional)"
                  type="text"
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="City, town, or area"
                  autoComplete="off"
                  maxLength={200}
                  icon={<FiMapPin />}
                />
              </div>

              <ChipGroup
                label="Gender"
                options={GENDER_OPTIONS}
                value={form.gender}
                onChange={(value) => setField("gender", value)}
                error={errors.gender}
              />
            </fieldset>

            <fieldset className={styles.section}>
              <legend className={styles.sectionTitle}>Your relationship</legend>

              <Input
                label="How are you related to the patient?"
                type="text"
                value={form.relationshipToCaregiver}
                onChange={handleChange("relationshipToCaregiver")}
                placeholder="e.g. Daughter, spouse, professional caregiver"
                autoComplete="off"
                maxLength={80}
                required
                icon={<FiHeart />}
                error={errors.relationshipToCaregiver}
              />
              <div className={styles.suggestions} aria-label="Quick picks">
                {RELATIONSHIP_SUGGESTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.chip} ${form.relationshipToCaregiver === option ? styles.chipActive : ""}`}
                    aria-pressed={form.relationshipToCaregiver === option}
                    onClick={() => setField("relationshipToCaregiver", option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <div className={styles.errorBox} role="alert">{error}</div>}

            <div className={styles.formActions}>
              <Button variant="secondary" to={back.to}>Cancel</Button>
              <Button type="submit" disabled={submitting} icon={submitting ? <Spinner size="sm" /> : <FiSave size={15} />}>
                {submitting ? "Saving…" : isEditing ? "Save changes" : "Add patient"}
              </Button>
            </div>
          </form>
        </Card>

        {!isEditing && (
          <aside className={styles.aside}>
            <h2><FiInfo aria-hidden="true" /> What happens next?</h2>
            <ol>
              <li><strong>Onboarding:</strong> a short guided chat about the patient's health and home.</li>
              <li><strong>Risk assessment:</strong> generated from the chat, including sepsis risk.</li>
              <li><strong>Ongoing support:</strong> safety questions and personalised care guides.</li>
            </ol>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}

/** Single-choice pill group (radio semantics), used instead of a <select>. */
function ChipGroup({ label, options, value, onChange, error }) {
  // Keep an existing value visible even if it isn't one of the standard options.
  const choices = value && !options.includes(value) ? [...options, value] : options;
  return (
    <div className={styles.chipField} role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined}>
      <span className={styles.chipLabel}>{label}</span>
      <div className={styles.suggestions}>
        {choices.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={`${styles.chip} ${value === option ? styles.chipActive : ""}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

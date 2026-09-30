import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft, FiBookmark, FiBookOpen,
  FiAlertTriangle, FiCheckCircle,
} from "react-icons/fi";
import { RiMedicineBottleLine } from "react-icons/ri";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import MaterialDetail from "./MaterialDetail.jsx";
import * as microlearningApi from "../../api/microlearningApi";
import * as patientApi from "../../api/patientApi";
import styles from "./MicrolearningPage.module.css";

const TOPIC_LABELS = {
  wound_care:           "Wound Care",
  infection_prevention: "Infection Prevention",
  sepsis_red_flags:     "Sepsis Red Flags",
  pressure_injury:      "Pressure Injury",
  mobility_support:     "Mobility Support",
  environmental_safety: "Environmental Safety",
  hygiene:              "Hygiene",
  nutrition:            "Nutrition",
  caregiver_support:    "Caregiver Support",
  family_rotation:      "Family Rotation",
  diabetes:             "Diabetes",
  general:              "General Care",
};

const GENERATABLE_TOPICS = Object.entries(TOPIC_LABELS).map(([value, label]) => ({ value, label }));

const TRACK_COLORS = {
  PRIMARY:   { bg:"#e8f0fa", color:"#2563a6",  label:"Primary Prevention"  },
  SECONDARY: { bg:"#fdf3dc", color:"#b7791f",  label:"Secondary Prevention"},
  COMBINED:  { bg:"#fbe9e7", color:"#c0392b",  label:"Combined"            },
  GENERAL:   { bg:"#e6f4ea", color:"#2f855a",  label:"General Care"        },
};

export default function MicrolearningPage() {
  const { id: patientId } = useParams();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const highlightId       = searchParams.get("highlight");

  const [patient,    setPatient]    = useState(null);
  const [materials,  setMaterials]  = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [assigning,  setAssigning]  = useState(null); // materialId being toggled
  const [error,      setError]      = useState("");
  const [genTopic,   setGenTopic]   = useState("wound_care");
  const [showGenForm, setShowGenForm] = useState(false);

  async function loadMaterials() {
    try {
      const res = await microlearningApi.listMaterials(patientId);
      const mats = res.data.materials;
      setMaterials(mats);
      // Auto-open highlighted material (from safety query link)
      if (highlightId) {
        const mat = mats.find((m) => m.id === highlightId);
        if (mat) setSelected(mat);
      }
    } catch {
      setError("Could not load materials.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const patRes = await patientApi.getPatient(patientId);
        if (!cancelled) setPatient(patRes.data.patient);
        await loadMaterials();
      } catch {
        if (!cancelled) setError("Could not load patient data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      await microlearningApi.requestGeneration(patientId, genTopic);
      await loadMaterials();
      setShowGenForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleAssign(materialId, currentState) {
    setAssigning(materialId);
    try {
      await microlearningApi.toggleAssign(materialId, !currentState);
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, isAssigned: !currentState } : m))
      );
      if (selected?.id === materialId) setSelected((s) => ({ ...s, isAssigned: !currentState }));
    } catch {
      setError("Could not update assignment.");
    } finally {
      setAssigning(null);
    }
  }

  const assigned   = materials.filter((m) => m.isAssigned);
  const recommended = materials.filter((m) => !m.isAssigned && m.isAutoRecommended);
  const others     = materials.filter((m) => !m.isAssigned && !m.isAutoRecommended);

  if (loading) return <AppLayout><div className={styles.center}><Spinner size="lg" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(`/patients/${patientId}`)}>
          <FiArrowLeft size={15} /> Back to {patient?.fullName}
        </button>
        <h1>Microlearning Library</h1>
        <p className={styles.subtitle}>
          Patient-specific care guides for <strong>{patient?.fullName}</strong>. Assign guides to the care plan and download for offline reference.
        </p>
      </div>

      {error && <div className={styles.errorBox}><FiAlertTriangle size={15}/> {error}</div>}

      <div className={styles.layout}>
        {/* ── Left: material list ──────────────────────────────── */}
        <div className={styles.listPanel}>

          {/* Generate new material */}
          <div className={styles.generateSection}>
            {!showGenForm ? (
              <button className={styles.genBtn} onClick={() => setShowGenForm(true)}>
                <RiMedicineBottleLine size={16} /> Request new guide
              </button>
            ) : (
              <form className={styles.genForm} onSubmit={handleGenerate}>
                <label className={styles.genLabel}>Select topic to generate:</label>
                <select
                  className={styles.genSelect}
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                >
                  {GENERATABLE_TOPICS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div className={styles.genActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowGenForm(false)}>Cancel</button>
                  <button type="submit" className={styles.genSubmitBtn} disabled={generating}>
                    {generating ? <><Spinner size="sm" /> Generating…</> : "Generate guide"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {materials.length === 0 && (
            <div className={styles.emptyList}>
              <FiBookOpen size={36} className={styles.emptyIcon} />
              <p>No materials yet.</p>
              <p className={styles.emptyHint}>Complete the onboarding assessment to auto-generate guides, or request one above.</p>
            </div>
          )}

          {/* Assigned to care plan */}
          {assigned.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><FiBookmark size={14}/> Care Plan</h3>
              {assigned.map((m) => <MaterialListItem key={m.id} material={m} selected={selected?.id === m.id} onSelect={() => setSelected(m)} onToggleAssign={handleToggleAssign} assigning={assigning} />)}
            </div>
          )}

          {/* Auto-recommended */}
          {recommended.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><FiCheckCircle size={14}/> Recommended</h3>
              {recommended.map((m) => <MaterialListItem key={m.id} material={m} selected={selected?.id === m.id} onSelect={() => setSelected(m)} onToggleAssign={handleToggleAssign} assigning={assigning} />)}
            </div>
          )}

          {/* Other materials */}
          {others.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Other guides</h3>
              {others.map((m) => <MaterialListItem key={m.id} material={m} selected={selected?.id === m.id} onSelect={() => setSelected(m)} onToggleAssign={handleToggleAssign} assigning={assigning} />)}
            </div>
          )}
        </div>

        {/* ── Right: material detail ───────────────────────────── */}
        <div className={styles.detailPanel}>
          {selected ? (
            <MaterialDetail
              material={selected}
              onToggleAssign={handleToggleAssign}
              assigning={assigning}
            />
          ) : (
            <div className={styles.noSelection}>
              <FiBookOpen size={40} className={styles.noSelIcon} />
              <p>Select a guide to read it</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MaterialListItem({ material, selected, onSelect, onToggleAssign, assigning }) {
  const track = TRACK_COLORS[material.preventionTrack] || TRACK_COLORS.GENERAL;
  return (
    <button
      className={`${styles.materialItem} ${selected ? styles.materialItemActive : ""}`}
      onClick={onSelect}
    >
      <div className={styles.materialItemTop}>
        <span className={styles.materialTitle}>{material.title}</span>
        <button
          className={`${styles.assignBtn} ${material.isAssigned ? styles.assignBtnActive : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleAssign(material.id, material.isAssigned); }}
          disabled={assigning === material.id}
          title={material.isAssigned ? "Remove from care plan" : "Add to care plan"}
        >
          <FiBookmark size={13} />
        </button>
      </div>
      <div className={styles.materialMeta}>
        <span className={styles.trackBadge} style={{ background: track.bg, color: track.color }}>
          {track.label}
        </span>
        <span className={styles.topicTag}>{TOPIC_LABELS[material.topic] || material.topic}</span>
      </div>
    </button>
  );
}

import { useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiCheckCircle, FiExternalLink, FiGlobe, FiPlus, FiTrash2, FiUpload, FiEye, FiEyeOff } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import * as orgApi from "../../api/organizationGuidesApi";
import styles from "./OrganizationDashboard.module.css";

const BLANK_GUIDE = { title: "", prognosisVector: "", details: "", tags: "", status: "PUBLISHED", sourceIds: [] };
const BLANK_SOURCE = { name: "", url: "", notes: "", approve: false };

const GUIDE_STATUS = {
  PUBLISHED: { tone: "success", label: "Published" },
  DRAFT:     { tone: "neutral", label: "Draft" },
  ARCHIVED:  { tone: "neutral", label: "Archived" },
};

const SOURCE_STATUS = {
  APPROVED: { tone: "success", label: "Approved" },
  PENDING:  { tone: "warning", label: "Pending review" },
  REJECTED: { tone: "danger",  label: "Rejected" },
};

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [tab, setTab] = useState("guides");
  const [guides, setGuides] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadData() {
    try {
      const [guideRes, sourceRes] = await Promise.all([orgApi.listGuides(), orgApi.listSources()]);
      setGuides(guideRes.data.guides);
      setSources(sourceRes.data.sources);
      setLoadError("");
    } catch {
      setLoadError("Could not load organization materials. Check your account setup and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const approvedSources = sources.filter((item) => item.status === "APPROVED");

  // Run an action, refresh the lists, and report the outcome as a toast.
  async function act(action, success, failure) {
    try {
      await action();
      await loadData();
      if (success) showToast(success);
    } catch (err) {
      showToast(err.response?.data?.error || failure, { type: "error" });
    }
  }

  function toggleGuideStatus(item) {
    const status = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    return act(
      () => orgApi.updateGuide(item.id, { status }),
      status === "PUBLISHED" ? `“${item.title}” is now visible to caregivers.` : `“${item.title}” moved to drafts.`,
      "Could not update the guide."
    );
  }

  function toggleSourceStatus(item) {
    const status = item.status === "APPROVED" ? "PENDING" : "APPROVED";
    return act(
      () => orgApi.updateSourceStatus(item.id, status),
      status === "APPROVED" ? `“${item.name}” approved.` : `Approval revoked for “${item.name}”.`,
      "Could not update source approval."
    );
  }

  async function removeGuide(item) {
    const ok = await confirm({
      title: `Delete “${item.title}”?`,
      message: "Caregivers will no longer be able to open this guide. This cannot be undone.",
      confirmLabel: "Delete guide",
      danger: true,
    });
    if (ok) act(() => orgApi.deleteGuide(item.id), "Guide deleted.", "Could not delete the guide.");
  }

  async function removeSource(item) {
    const ok = await confirm({
      title: `Delete source “${item.name}”?`,
      message: "It will be detached from any guides that use it. This cannot be undone.",
      confirmLabel: "Delete source",
      danger: true,
    });
    if (ok) act(() => orgApi.deleteSource(item.id), "Source deleted.", "Could not delete the source.");
  }

  const stats = [
    { label: "Guides",           value: guides.length },
    { label: "Published",        value: guides.filter((item) => item.status === "PUBLISHED").length },
    { label: "Approved sources", value: approvedSources.length },
  ];

  return (
    <AppLayout title="Guide management">
      <PageHeader
        icon={<FiBookOpen />}
        eyebrow="Organization workspace"
        title={user?.organization?.name || "Guide management"}
        subtitle="Upload learning guides and curate approved web sources for caregivers."
      />

      <div className={styles.stats}>
        {stats.map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <strong>{loading ? "–" : value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Organization content">
        <TabButton id="guides" active={tab} onSelect={setTab} icon={<FiBookOpen />}>Learning guides</TabButton>
        <TabButton id="sources" active={tab} onSelect={setTab} icon={<FiGlobe />}>Verified sources</TabButton>
      </div>

      {loadError && <p className={styles.error} role="alert">{loadError}</p>}

      {loading ? (
        <HeartbeatLoader label="Loading your workspace…" />
      ) : tab === "guides" ? (
        <div className={styles.layout} role="tabpanel" id="panel-guides" aria-labelledby="tab-guides">
          <GuideUploadForm
            guides={guides}
            approvedSources={approvedSources}
            onUploaded={async () => { await loadData(); showToast("Learning guide uploaded."); }}
          />
          <section className={styles.listCard}>
            <div className={styles.sectionHeader}>
              <h2>Your guides</h2>
              <p>Only published guides appear in the caregiver library.</p>
            </div>
            {guides.length === 0 ? (
              <EmptyState icon={<FiBookOpen />} title="No guides yet">
                Upload your first PDF guide using the form.
              </EmptyState>
            ) : (
              <div className={styles.list}>
                {guides.map((item) => (
                  <GuideCard key={item.id} item={item} onToggle={toggleGuideStatus} onDelete={removeGuide} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className={styles.layout} role="tabpanel" id="panel-sources" aria-labelledby="tab-sources">
          <SourceForm onCreated={async () => { await loadData(); showToast("Source added to your organization library."); }} />
          <section className={styles.listCard}>
            <div className={styles.sectionHeader}>
              <h2>Organization sources</h2>
              <p>Only approved sources attached to published guides are considered by Microlearning.</p>
            </div>
            {sources.length === 0 ? (
              <EmptyState icon={<FiGlobe />} title="No sources yet">
                Add a trusted web page using the form.
              </EmptyState>
            ) : (
              <div className={styles.list}>
                {sources.map((item) => (
                  <SourceCard key={item.id} item={item} onToggle={toggleSourceStatus} onDelete={removeSource} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}

function TabButton({ id, active, onSelect, icon, children }) {
  const selected = active === id;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      aria-controls={`panel-${id}`}
      className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
      onClick={() => onSelect(id)}
    >
      {icon} {children}
    </button>
  );
}

/* ── Guides ─────────────────────────────────────────────────── */

function GuideUploadForm({ guides, approvedSources, onUploaded }) {
  const [file, setFile] = useState(null);
  const [guide, setGuide] = useState(BLANK_GUIDE);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Offer values already used by this organization, to keep naming consistent.
  const suggestions = useMemo(() => ({
    vectors: [...new Set(guides.map((item) => item.prognosisVector))],
    details: [...new Set(guides.map((item) => item.details))],
    tags:    [...new Set(guides.flatMap((item) => item.tags || []))],
  }), [guides]);

  const update = (field) => (event) => setGuide((prev) => ({ ...prev, [field]: event.target.value }));

  function toggleSource(id, checked) {
    setGuide((prev) => ({
      ...prev,
      sourceIds: checked ? [...prev.sourceIds, id] : prev.sourceIds.filter((sourceId) => sourceId !== id),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!file) { setError("Choose a PDF file first."); return; }

    const payload = new FormData();
    payload.append("pdf", file);
    payload.append("title", guide.title);
    payload.append("prognosisVector", guide.prognosisVector);
    payload.append("details", guide.details);
    payload.append("tags", JSON.stringify(guide.tags.split(",").map((value) => value.trim()).filter(Boolean)));
    payload.append("sourceIds", JSON.stringify(guide.sourceIds));
    payload.append("status", guide.status);

    const form = event.target;
    setUploading(true);
    try {
      await orgApi.uploadGuide(payload);
      setFile(null);
      setGuide(BLANK_GUIDE);
      form.reset();
      await onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Check that PDF storage is configured.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <h2><FiUpload aria-hidden="true" /> Upload a guide</h2>

      <label className={styles.field}>
        PDF file
        <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
        <span className={styles.fieldHint}>PDF only, up to 15 MB.</span>
      </label>

      <label className={styles.field}>
        Guide title
        <input value={guide.title} onChange={update("title")} required maxLength={160} />
      </label>

      <label className={styles.field}>
        Prognosis vector
        <input list="vector-suggestions" value={guide.prognosisVector} onChange={update("prognosisVector")} placeholder="e.g. Medical condition" required maxLength={120} />
        <datalist id="vector-suggestions">{suggestions.vectors.map((value) => <option key={value} value={value} />)}</datalist>
      </label>

      <label className={styles.field}>
        Details
        <input list="detail-suggestions" value={guide.details} onChange={update("details")} placeholder="e.g. Diabetes care" required maxLength={500} />
        <datalist id="detail-suggestions">{suggestions.details.map((value) => <option key={value} value={value} />)}</datalist>
      </label>

      <label className={styles.field}>
        Tags
        <input list="tag-suggestions" value={guide.tags} onChange={update("tags")} placeholder="e.g. Elderly patients, Home care" />
        <span className={styles.fieldHint}>Separate tags with commas.</span>
        <datalist id="tag-suggestions">{suggestions.tags.map((value) => <option key={value} value={value} />)}</datalist>
      </label>

      <label className={styles.field}>
        Publication status
        <select value={guide.status} onChange={update("status")}>
          <option value="PUBLISHED">Publish for caregivers</option>
          <option value="DRAFT">Save as draft</option>
        </select>
      </label>

      <fieldset className={styles.sourcePicker}>
        <legend>Attach approved sources (optional)</legend>
        {approvedSources.length ? approvedSources.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={guide.sourceIds.includes(item.id)} onChange={(event) => toggleSource(item.id, event.target.checked)} />
            <span>{item.name}</span>
          </label>
        )) : <p>Add and approve a source from the Verified sources tab.</p>}
      </fieldset>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <Button type="submit" disabled={uploading} icon={uploading ? <Spinner size="sm" /> : <FiPlus />} fullWidth>
        {uploading ? "Uploading…" : "Upload PDF guide"}
      </Button>
    </form>
  );
}

function GuideCard({ item, onToggle, onDelete }) {
  const published = item.status === "PUBLISHED";
  const status = GUIDE_STATUS[item.status] || { tone: "neutral", label: item.status.toLowerCase() };
  return (
    <article className={styles.itemCard}>
      <div className={styles.itemHeading}>
        <div className={styles.itemTitle}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <h3>{item.title}</h3>
        </div>
        <a className={styles.iconLink} href={orgApi.guidePdfUrl(item.id)} target="_blank" rel="noreferrer" aria-label={`Preview ${item.title}`} title="Preview PDF">
          <FiExternalLink />
        </a>
      </div>
      <p className={styles.meta}>{item.prognosisVector} · {item.details}</p>
      {item.tags?.length > 0 && (
        <div className={styles.tagRow}>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      )}
      <div className={styles.itemActions}>
        <Button variant="secondary" icon={published ? <FiEyeOff size={14} /> : <FiEye size={14} />} onClick={() => onToggle(item)}>
          {published ? "Unpublish" : "Publish"}
        </Button>
        <Button variant="secondary" icon={<FiTrash2 size={14} />} onClick={() => onDelete(item)} className={styles.dangerAction}>
          Delete
        </Button>
      </div>
    </article>
  );
}

/* ── Sources ────────────────────────────────────────────────── */

function SourceForm({ onCreated }) {
  const [source, setSource] = useState(BLANK_SOURCE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (event) => setSource((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const form = event.target;
    setSaving(true);
    try {
      await orgApi.createSource(source);
      setSource(BLANK_SOURCE);
      form.reset();
      await onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save this source URL.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <h2><FiGlobe aria-hidden="true" /> Add an approved source</h2>
      <p className={styles.formHint}>
        The organization is responsible for reviewing the source. Approved public pages may be used to ground patient-specific Microlearning.
      </p>

      <label className={styles.field}>
        Source name
        <input value={source.name} onChange={update("name")} required maxLength={160} placeholder="e.g. WHO sepsis guidance" />
      </label>

      <label className={styles.field}>
        Website URL
        <input type="url" inputMode="url" value={source.url} onChange={update("url")} required placeholder="https://example.org/guidance" />
      </label>

      <label className={styles.field}>
        Review notes
        <textarea value={source.notes} onChange={update("notes")} rows={3} maxLength={500} />
      </label>

      <label className={styles.checkField}>
        <input type="checkbox" checked={source.approve} onChange={(event) => setSource((prev) => ({ ...prev, approve: event.target.checked }))} />
        I have reviewed this source and approve it for use
      </label>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <Button type="submit" disabled={saving} icon={saving ? <Spinner size="sm" /> : <FiPlus />} fullWidth>
        {saving ? "Saving…" : "Add source"}
      </Button>
    </form>
  );
}

function SourceCard({ item, onToggle, onDelete }) {
  const approved = item.status === "APPROVED";
  const status = SOURCE_STATUS[item.status] || { tone: "neutral", label: item.status.toLowerCase() };
  const linked = item.guides?.length || 0;
  return (
    <article className={styles.itemCard}>
      <div className={styles.itemHeading}>
        <div className={styles.itemTitle}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <h3>{item.name}</h3>
        </div>
        <a className={styles.iconLink} href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name}`} title="Open website">
          <FiExternalLink />
        </a>
      </div>
      <a className={styles.url} href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
      {item.notes && <p className={styles.meta}>{item.notes}</p>}
      <p className={styles.meta}>{linked} guide{linked === 1 ? "" : "s"} linked</p>
      <div className={styles.itemActions}>
        <Button variant="secondary" icon={<FiCheckCircle size={14} />} onClick={() => onToggle(item)}>
          {approved ? "Revoke approval" : "Approve source"}
        </Button>
        <Button variant="secondary" icon={<FiTrash2 size={14} />} onClick={() => onDelete(item)} className={styles.dangerAction}>
          Delete
        </Button>
      </div>
    </article>
  );
}

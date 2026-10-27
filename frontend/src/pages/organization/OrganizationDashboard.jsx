import { useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiCheckCircle, FiExternalLink, FiGlobe, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import * as orgApi from "../../api/organizationGuidesApi";
import styles from "./OrganizationDashboard.module.css";

const blankSource = { name: "", url: "", notes: "", approve: false };

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [tab, setTab] = useState("guides");
  const [guides, setGuides] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [guide, setGuide] = useState({ title: "", prognosisVector: "", details: "", tags: "", status: "PUBLISHED", sourceIds: [] });
  const [source, setSource] = useState(blankSource);
  const [savingSource, setSavingSource] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [guideRes, sourceRes] = await Promise.all([orgApi.listGuides(), orgApi.listSources()]);
      setGuides(guideRes.data.guides);
      setSources(sourceRes.data.sources);
    } catch {
      setError("Could not load organization materials. Check your account setup and try again.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const suggestions = useMemo(() => ({
    vectors: [...new Set(guides.map((item) => item.prognosisVector))],
    details: [...new Set(guides.map((item) => item.details))],
    tags: [...new Set(guides.flatMap((item) => item.tags || []))],
  }), [guides]);

  async function handleUpload(event) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!file) { setError("Choose a PDF file first."); return; }
    const payload = new FormData();
    payload.append("pdf", file);
    payload.append("title", guide.title);
    payload.append("prognosisVector", guide.prognosisVector);
    payload.append("details", guide.details);
    payload.append("tags", JSON.stringify(guide.tags.split(",").map((value) => value.trim()).filter(Boolean)));
    payload.append("sourceIds", JSON.stringify(guide.sourceIds));
    payload.append("status", guide.status);
    setUploading(true);
    try {
      await orgApi.uploadGuide(payload);
      setFile(null);
      setGuide({ title: "", prognosisVector: "", details: "", tags: "", status: "PUBLISHED", sourceIds: [] });
      event.target.reset();
      setNotice("Learning guide uploaded.");
      await loadData();
    } catch (err) { setError(err.response?.data?.error || "Upload failed. Check that PDF storage is configured."); }
    finally { setUploading(false); }
  }

  async function handleSourceSubmit(event) {
    event.preventDefault(); setError(""); setNotice(""); setSavingSource(true);
    try {
      await orgApi.createSource(source);
      setSource(blankSource);
      event.target.reset();
      setNotice("Source added to your organization library.");
      await loadData();
    } catch (err) { setError(err.response?.data?.error || "Could not save this source URL."); }
    finally { setSavingSource(false); }
  }

  async function toggleGuideStatus(item) {
    const status = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try { await orgApi.updateGuide(item.id, { status }); await loadData(); }
    catch (err) { setError(err.response?.data?.error || "Could not update the guide."); }
  }

  async function toggleSourceStatus(item) {
    const status = item.status === "APPROVED" ? "PENDING" : "APPROVED";
    try { await orgApi.updateSourceStatus(item.id, status); await loadData(); }
    catch (err) { setError(err.response?.data?.error || "Could not update source approval."); }
  }

  async function removeGuide(item) {
    const ok = await confirm({
      title: `Delete “${item.title}”?`,
      message: "Caregivers will no longer be able to open this guide. This cannot be undone.",
      confirmLabel: "Delete guide",
      danger: true,
    });
    if (!ok) return;
    try { await orgApi.deleteGuide(item.id); await loadData(); }
    catch (err) { setError(err.response?.data?.error || "Could not delete the guide."); }
  }

  async function removeSource(item) {
    const ok = await confirm({
      title: `Delete source “${item.name}”?`,
      message: "It will be detached from any guides that use it. This cannot be undone.",
      confirmLabel: "Delete source",
      danger: true,
    });
    if (!ok) return;
    try { await orgApi.deleteSource(item.id); await loadData(); }
    catch (err) { setError(err.response?.data?.error || "Could not delete the source."); }
  }

  return (
    <AppLayout>
      <header className={styles.header}>
        <div className={styles.headerIcon}><FiBookOpen size={24} /></div>
        <div><p className={styles.eyebrow}>Organization workspace</p><h1>{user?.organization?.name || "Guide management"}</h1><p className={styles.subtitle}>Upload learning guides and curate approved web sources for caregivers.</p></div>
      </header>
      <div className={styles.stats}><div><strong>{guides.length}</strong><span>Guides</span></div><div><strong>{guides.filter((item) => item.status === "PUBLISHED").length}</strong><span>Published</span></div><div><strong>{sources.filter((item) => item.status === "APPROVED").length}</strong><span>Approved sources</span></div></div>
      <div className={styles.tabs} role="tablist" aria-label="Organization content"><button role="tab" aria-selected={tab === "guides"} className={tab === "guides" ? styles.activeTab : ""} onClick={() => setTab("guides")}><FiBookOpen /> Learning guides</button><button role="tab" aria-selected={tab === "sources"} className={tab === "sources" ? styles.activeTab : ""} onClick={() => setTab("sources")}><FiGlobe /> Verified sources</button></div>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
      {loading ? <div className={styles.loading}><HeartbeatLoader label="Loading your workspace…" /></div> : tab === "guides" ? (
        <div className={styles.contentGrid}>
          <form className={styles.formCard} onSubmit={handleUpload}>
            <h2><FiUpload /> Upload a guide</h2>
            <label className={styles.field}>PDF file<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
            <label className={styles.field}>Guide title<input value={guide.title} onChange={(event) => setGuide((prev) => ({ ...prev, title: event.target.value }))} required maxLength={160} /></label>
            <label className={styles.field}>Prognosis vector<input list="vector-suggestions" value={guide.prognosisVector} onChange={(event) => setGuide((prev) => ({ ...prev, prognosisVector: event.target.value }))} placeholder="e.g. Medical condition" required maxLength={120} /><datalist id="vector-suggestions">{suggestions.vectors.map((value) => <option key={value} value={value} />)}</datalist></label>
            <label className={styles.field}>Details<input list="detail-suggestions" value={guide.details} onChange={(event) => setGuide((prev) => ({ ...prev, details: event.target.value }))} placeholder="e.g. Diabetes care" required maxLength={500} /><datalist id="detail-suggestions">{suggestions.details.map((value) => <option key={value} value={value} />)}</datalist></label>
            <label className={styles.field}>Tags <span className={styles.fieldHint}>Separate tags with commas</span><input list="tag-suggestions" value={guide.tags} onChange={(event) => setGuide((prev) => ({ ...prev, tags: event.target.value }))} placeholder="e.g. Elderly patients, Home care" /><datalist id="tag-suggestions">{suggestions.tags.map((value) => <option key={value} value={value} />)}</datalist></label>
            <label className={styles.field}>Publication status<select value={guide.status} onChange={(event) => setGuide((prev) => ({ ...prev, status: event.target.value }))}><option value="PUBLISHED">Publish for caregivers</option><option value="DRAFT">Save as draft</option></select></label>
            <fieldset className={styles.sourcePicker}><legend>Attach approved sources (optional)</legend>{sources.filter((item) => item.status === "APPROVED").length ? sources.filter((item) => item.status === "APPROVED").map((item) => <label key={item.id}><input type="checkbox" checked={guide.sourceIds.includes(item.id)} onChange={(event) => setGuide((prev) => ({ ...prev, sourceIds: event.target.checked ? [...prev.sourceIds, item.id] : prev.sourceIds.filter((id) => id !== item.id) }))} /><span>{item.name}</span></label>) : <p>Add and approve a source from the Verified sources tab.</p>}</fieldset>
            <button className={styles.primaryButton} type="submit" disabled={uploading}>{uploading ? <><Spinner size="sm" /> Uploading…</> : <><FiPlus /> Upload PDF guide</>}</button>
            <p className={styles.formHint}>PDF only, up to 15 MB. Store settings must be configured on the backend.</p>
          </form>
          <section className={styles.listSection}><div className={styles.sectionHeader}><div><h2>Your guides</h2><p>Only published guides appear in the caregiver library.</p></div></div>
            {guides.length === 0 ? <div className={styles.empty}><FiBookOpen size={30} /><p>No guides uploaded yet.</p></div> : <div className={styles.guideList}>{guides.map((item) => <article className={styles.guideCard} key={item.id}><div className={styles.guideHeading}><div><span className={`${styles.status} ${item.status === "PUBLISHED" ? styles.published : ""}`}>{item.status === "PUBLISHED" ? "Published" : item.status.toLowerCase()}</span><h3>{item.title}</h3></div><a className={styles.iconLink} href={orgApi.guidePdfUrl(item.id)} target="_blank" rel="noreferrer" aria-label={`Preview ${item.title}`}><FiExternalLink /></a></div><p className={styles.guideMeta}>{item.prognosisVector} · {item.details}</p><div className={styles.tagRow}>{(item.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div><div className={styles.guideActions}><button type="button" onClick={() => toggleGuideStatus(item)}>{item.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button><button type="button" className={styles.dangerAction} onClick={() => removeGuide(item)}><FiTrash2 /> Delete</button></div></article>)}</div>}
          </section>
        </div>
      ) : (
        <div className={styles.sourceLayout}>
          <form className={styles.formCard} onSubmit={handleSourceSubmit}><h2><FiGlobe /> Add an approved source</h2><p className={styles.formHint}>The organization is responsible for reviewing the source. Approved public pages may be used to ground patient-specific Microlearning.</p><label className={styles.field}>Source name<input value={source.name} onChange={(event) => setSource((prev) => ({ ...prev, name: event.target.value }))} required maxLength={160} placeholder="e.g. WHO sepsis guidance" /></label><label className={styles.field}>Website URL<input type="url" inputMode="url" value={source.url} onChange={(event) => setSource((prev) => ({ ...prev, url: event.target.value }))} required placeholder="https://example.org/guidance" /></label><label className={styles.field}>Review notes<textarea value={source.notes} onChange={(event) => setSource((prev) => ({ ...prev, notes: event.target.value }))} rows={3} maxLength={500} /></label><label className={styles.checkField}><input type="checkbox" checked={source.approve} onChange={(event) => setSource((prev) => ({ ...prev, approve: event.target.checked }))} /> I have reviewed this source and approve it for use</label><button className={styles.primaryButton} type="submit" disabled={savingSource}>{savingSource ? <Spinner size="sm" /> : <FiPlus />} Add source</button></form>
          <section className={styles.listSection}><div className={styles.sectionHeader}><div><h2>Organization sources</h2><p>Only approved sources attached to published guides are considered by Microlearning.</p></div></div>{sources.length === 0 ? <div className={styles.empty}><FiGlobe size={30} /><p>No sources added yet.</p></div> : <div className={styles.sourceList}>{sources.map((item) => <article className={styles.sourceCard} key={item.id}><div className={styles.guideHeading}><div><span className={`${styles.status} ${item.status === "APPROVED" ? styles.published : ""}`}>{item.status.toLowerCase()}</span><h3>{item.name}</h3></div><a className={styles.iconLink} href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name}`}><FiExternalLink /></a></div><a className={styles.url} href={item.url} target="_blank" rel="noreferrer">{item.url}</a>{item.notes && <p className={styles.guideMeta}>{item.notes}</p>}<p className={styles.guideMeta}>{item.guides?.length || 0} guide{item.guides?.length === 1 ? "" : "s"} linked</p><div className={styles.guideActions}><button type="button" onClick={() => toggleSourceStatus(item)}>{item.status === "APPROVED" ? "Revoke approval" : "Approve source"}</button><button type="button" className={styles.dangerAction} onClick={() => removeSource(item)}><FiTrash2 /> Delete</button></div></article>)}</div>}</section>
        </div>
      )}
    </AppLayout>
  );
}

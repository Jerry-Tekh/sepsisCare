import { useEffect, useState } from "react";
import { FiBookOpen, FiDownload, FiExternalLink, FiSearch } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import HeartbeatLoader from "../../components/common/HeartbeatLoader.jsx";
import * as guidesApi from "../../api/learningGuidesApi";
import styles from "./LearningGuidesPage.module.css";

const emptyOptions = { vectors: [], details: [], tags: [] };

export default function LearningGuidesPage() {
  const [options, setOptions] = useState(emptyOptions);
  const [guides, setGuides] = useState([]);
  const [filters, setFilters] = useState({ q: "", vector: "", detail: "", tag: "" });
  const [submitted, setSubmitted] = useState(filters);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    guidesApi.getGuideOptions().then(({ data }) => setOptions(data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    guidesApi.listGuides({ ...submitted, page, pageSize: 12 })
      .then(({ data }) => {
        if (cancelled) return;
        setGuides(data.guides);
        setTotal(data.total);
        setPageCount(data.pageCount || 1);
      })
      .catch(() => { if (!cancelled) setError("Could not load the learning guides. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [submitted, page]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSubmitted({ ...filters });
  }

  function clearFilters() {
    const clean = { q: "", vector: "", detail: "", tag: "" };
    setFilters(clean);
    setSubmitted(clean);
    setPage(1);
  }

  async function openGuidePdf(guideId) {
    // Open a tab synchronously from the click handler so Firefox does not
    // treat the later navigation (after the authenticated API call) as a popup.
    const pdfWindow = window.open("about:blank", "_blank");
    if (!pdfWindow) {
      setPdfError("Allow pop-ups for this site, then try opening the PDF again.");
      return;
    }
    pdfWindow.opener = null;
    setPdfError("");
    try {
      const { data } = await guidesApi.getPdfUrl(guideId);
      pdfWindow.location.href = data.url;
    } catch {
      pdfWindow.close();
      setPdfError("Could not open this PDF. Please try again.");
    }
  }

  async function downloadGuidePdf(guideId) {
    setPdfError("");
    try {
      const { data } = await guidesApi.getPdfUrl(guideId, true);
      const link = document.createElement("a");
      link.href = data.url;
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setPdfError("Could not download this PDF. Please try again.");
    }
  }

  return (
    <AppLayout title="Learning guides">
      <PageHeader
        icon={<FiBookOpen />}
        eyebrow="Organization learning library"
        title="Learning guides"
        subtitle="Browse practical PDF guides shared by healthcare organizations."
      />

      <form className={styles.filters} onSubmit={submitSearch}>
        <label className={styles.searchBox}>
          <FiSearch aria-hidden="true" />
          <input value={filters.q} onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))} placeholder="Search conditions, topics, or tags" aria-label="Search learning guides" />
        </label>
        <label className={styles.filterField}><span>Prognosis vector</span><select value={filters.vector} onChange={(event) => setFilters((prev) => ({ ...prev, vector: event.target.value }))}><option value="">All vectors</option>{options.vectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className={styles.filterField}><span>Details</span><select value={filters.detail} onChange={(event) => setFilters((prev) => ({ ...prev, detail: event.target.value }))}><option value="">All details</option>{options.details.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className={styles.filterField}><span>Tag</span><select value={filters.tag} onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}><option value="">All tags</option>{options.tags.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className={styles.filterActions}>
          <Button type="submit" icon={<FiSearch size={15} />}>Search</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
        </div>
      </form>

      <div className={styles.resultsHeader}><h2>Available guides</h2><span>{total} guide{total === 1 ? "" : "s"}</span></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {pdfError && <p className={styles.error} role="alert">{pdfError}</p>}
      {loading ? <div className={styles.loading}><HeartbeatLoader label="Loading guides…" /></div> : guides.length === 0 ? (
        <EmptyState icon={<FiBookOpen />} title="No guides found">
          Try another search or filter combination.
        </EmptyState>
      ) : (
        <div className={styles.grid}>
          {guides.map((guide) => (
            <article className={styles.card} key={guide.id}>
              <div className={styles.cardTop}><span className={styles.pdfBadge}>PDF guide</span><span className={styles.vector}>{guide.prognosisVector}</span></div>
              <h3>{guide.title}</h3>
              <p className={styles.details}>{guide.details}</p>
              <p className={styles.organization}>Shared by {guide.organization?.name || "Healthcare organization"}</p>
              {guide.tags?.length > 0 && <div className={styles.tags}>{guide.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
              {guide.sources?.length > 0 && <div className={styles.sourceList}><strong>Verified sources</strong>{guide.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><FiExternalLink size={13} /> {source.name}</a>)}</div>}
              <div className={styles.cardActions}>
                <Button icon={<FiBookOpen size={15} />} onClick={() => openGuidePdf(guide.id)}>Open PDF</Button>
                <Button variant="secondary" icon={<FiDownload size={15} />} onClick={() => downloadGuidePdf(guide.id)}>Download</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && pageCount > 1 && (
        <nav className={styles.pagination} aria-label="Learning guide pages">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {page} of {pageCount}</span>
          <Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </nav>
      )}
    </AppLayout>
  );
}

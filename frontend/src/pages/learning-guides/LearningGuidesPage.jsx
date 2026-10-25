import { useEffect, useState } from "react";
import { FiBookOpen, FiDownload, FiExternalLink, FiSearch } from "react-icons/fi";
import AppLayout from "../../components/common/AppLayout.jsx";
import Spinner from "../../components/common/Spinner.jsx";
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

  return (
    <AppLayout>
      <header className={styles.header}>
        <div className={styles.headerIcon}><FiBookOpen size={24} /></div>
        <div>
          <p className={styles.eyebrow}>Organization learning library</p>
          <h1>Learning Guides</h1>
          <p className={styles.subtitle}>Browse practical PDF guides shared by healthcare organizations.</p>
        </div>
      </header>

      <form className={styles.filters} onSubmit={submitSearch}>
        <label className={styles.searchBox}>
          <FiSearch aria-hidden="true" />
          <input value={filters.q} onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))} placeholder="Search conditions, topics, or tags" aria-label="Search learning guides" />
        </label>
        <label className={styles.filterField}><span>Prognosis vector</span><select value={filters.vector} onChange={(event) => setFilters((prev) => ({ ...prev, vector: event.target.value }))}><option value="">All vectors</option>{options.vectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className={styles.filterField}><span>Details</span><select value={filters.detail} onChange={(event) => setFilters((prev) => ({ ...prev, detail: event.target.value }))}><option value="">All details</option>{options.details.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className={styles.filterField}><span>Tag</span><select value={filters.tag} onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}><option value="">All tags</option>{options.tags.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className={styles.filterActions}><button className={styles.primaryButton} type="submit">Search</button><button className={styles.clearButton} type="button" onClick={clearFilters}>Clear</button></div>
      </form>

      <div className={styles.resultsHeader}><h2>Available guides</h2><span>{total} guide{total === 1 ? "" : "s"}</span></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <div className={styles.loading}><Spinner size="lg" /></div> : guides.length === 0 ? (
        <div className={styles.empty}><FiBookOpen size={34} /><h3>No guides found</h3><p>Try another search or filter combination.</p></div>
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
              <div className={styles.cardActions}><a className={styles.primaryButton} href={guidesApi.pdfUrl(guide.id)} target="_blank" rel="noreferrer"><FiBookOpen size={15} /> Open PDF</a><a className={styles.secondaryButton} href={guidesApi.pdfUrl(guide.id, true)}><FiDownload size={15} /> Download</a></div>
            </article>
          ))}
        </div>
      )}
      {!loading && pageCount > 1 && <nav className={styles.pagination} aria-label="Learning guide pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    </AppLayout>
  );
}

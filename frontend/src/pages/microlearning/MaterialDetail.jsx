import { useState } from "react";
import {
  FiBookmark, FiDownload, FiCheckCircle, FiAlertTriangle,
  FiStar, FiEye, FiFileText, FiImage,
} from "react-icons/fi";
import { RiAlertFill } from "react-icons/ri";
import Spinner from "../../components/common/Spinner.jsx";
import { downloadPDF, downloadCard } from "../../api/microlearningApi";
import styles from "./MaterialDetail.module.css";

const TRACK_COLORS = {
  PRIMARY:   { bg:"#e8f0fa", color:"#2563a6",  label:"Primary Prevention"  },
  SECONDARY: { bg:"#fdf3dc", color:"#b7791f",  label:"Secondary Prevention"},
  COMBINED:  { bg:"#fbe9e7", color:"#c0392b",  label:"Combined"            },
  GENERAL:   { bg:"#e6f4ea", color:"#2f855a",  label:"General Care"        },
};

export default function MaterialDetail({ material, onToggleAssign, assigning }) {
  const [activeTab, setActiveTab] = useState("content");
  const [downloading, setDownloading] = useState(null);
  const content  = material.contentData || {};
  const track    = TRACK_COLORS[material.preventionTrack] || TRACK_COLORS.GENERAL;
  const isAssigning = assigning === material.id;

  async function handleDownloadPDF() {
    setDownloading("pdf");
    try { await downloadPDF(material.id, material.title); }
    catch { /* silently ignore - browser may have blocked */ }
    finally { setDownloading(null); }
  }

  async function handleDownloadCard() {
    setDownloading("card");
    try { await downloadCard(material.id, material.title); }
    catch { /* silently ignore */ }
    finally { setDownloading(null); }
  }

  return (
    <div className={styles.detail}>
      {/* Material header */}
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span
            className={styles.trackBadge}
            style={{ background: track.bg, color: track.color }}
          >
            {track.label}
          </span>
          {material.isAutoRecommended && (
            <span className={styles.recBadge}>
              <FiCheckCircle size={11} /> Recommended
            </span>
          )}
          {material.isAssigned && (
            <span className={styles.assignedBadge}>
              <FiBookmark size={11} /> In care plan
            </span>
          )}
        </div>

        <h2 className={styles.title}>{material.title}</h2>
        {content.summary && <p className={styles.summary}>{content.summary}</p>}

        {/* Action bar */}
        <div className={styles.actions}>
          <button
            className={`${styles.assignBtn} ${material.isAssigned ? styles.assignBtnActive : ""}`}
            onClick={() => onToggleAssign(material.id, material.isAssigned)}
            disabled={isAssigning}
          >
            {isAssigning ? <Spinner size="sm" /> : <FiBookmark size={14} />}
            {material.isAssigned ? "Remove from care plan" : "Add to care plan"}
          </button>

          <div className={styles.downloadGroup}>
            <span className={styles.downloadLabel}><FiDownload size={13} /> Download:</span>
            <button className={styles.downloadBtn} onClick={handleDownloadPDF} disabled={!!downloading} title="Download PDF">
              {downloading === "pdf" ? <Spinner size="sm" /> : <FiFileText size={14} />} PDF
            </button>
            <button className={styles.downloadBtn} onClick={handleDownloadCard} disabled={!!downloading} title="Download pictorial card (SVG)">
              {downloading === "card" ? <Spinner size="sm" /> : <FiImage size={14} />} Picture card
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className={styles.tabs}>
        {[
          { id: "content", label: "Full Guide",   icon: FiEye       },
          { id: "steps",   label: "Quick Steps",  icon: FiCheckCircle },
          { id: "danger",  label: "Warnings",     icon: FiAlertTriangle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>

        {/* Full Guide tab */}
        {activeTab === "content" && (
          <div className={styles.sections}>

            {/* What to do */}
            {content.prescriptive?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleSuccess}`}>
                  <FiCheckCircle size={16} /> What To Do
                </h3>
                <ol className={styles.orderedList}>
                  {content.prescriptive.map((step, i) => (
                    <li key={i} className={styles.listItem}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* What not to do */}
            {content.prohibitive?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleDanger}`}>
                  <FiAlertTriangle size={16} /> What NOT To Do
                </h3>
                <ul className={styles.unorderedList}>
                  {content.prohibitive.map((item, i) => (
                    <li key={i} className={`${styles.listItem} ${styles.listItemDanger}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Low-cost workarounds */}
            {content.lowCostWorkarounds?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleWarning}`}>
                  <FiStar size={16} /> Low-Cost Workarounds
                </h3>
                <ul className={styles.unorderedList}>
                  {content.lowCostWorkarounds.map((item, i) => (
                    <li key={i} className={`${styles.listItem} ${styles.listItemWarning}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key warning signs */}
            {content.keySigns?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleDanger}`}>
                  <RiAlertFill size={16} /> Warning Signs to Watch For
                </h3>
                <ul className={styles.unorderedList}>
                  {content.keySigns.map((sign, i) => (
                    <li key={i} className={`${styles.listItem} ${styles.listItemDanger}`}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Emergency action */}
            {content.emergencyAction && (
              <div className={styles.emergencyBox}>
                <p className={styles.emergencyLabel}>
                  <RiAlertFill size={15} /> Emergency Action
                </p>
                <p className={styles.emergencyText}>{content.emergencyAction}</p>
              </div>
            )}

            {/* Review note */}
            {content.reviewNote && (
              <p className={styles.reviewNote}>📋 {content.reviewNote}</p>
            )}
          </div>
        )}

        {/* Quick Steps tab — prescriptive only */}
        {activeTab === "steps" && (
          <div className={styles.sections}>
            <p className={styles.tabHint}>Follow these steps every time you care for the patient:</p>
            {content.prescriptive?.length > 0 ? (
              <ol className={styles.bigStepList}>
                {content.prescriptive.map((step, i) => (
                  <li key={i} className={styles.bigStep}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyTab}>No step-by-step instructions available.</p>
            )}
          </div>
        )}

        {/* Warnings tab — prohibitive + key signs */}
        {activeTab === "danger" && (
          <div className={styles.sections}>
            {content.prohibitive?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleDanger}`}>
                  <FiAlertTriangle size={16} /> NEVER Do These
                </h3>
                <ul className={styles.unorderedList}>
                  {content.prohibitive.map((item, i) => (
                    <li key={i} className={`${styles.listItem} ${styles.listItemDanger}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.keySigns?.length > 0 && (
              <div className={styles.section}>
                <h3 className={`${styles.sectionTitle} ${styles.titleDanger}`}>
                  <RiAlertFill size={16} /> Seek Help If You See:
                </h3>
                <ul className={styles.unorderedList}>
                  {content.keySigns.map((sign, i) => (
                    <li key={i} className={`${styles.listItem} ${styles.listItemDanger}`}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.emergencyAction && (
              <div className={styles.emergencyBox}>
                <p className={styles.emergencyLabel}><RiAlertFill size={15}/> Emergency Action</p>
                <p className={styles.emergencyText}>{content.emergencyAction}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

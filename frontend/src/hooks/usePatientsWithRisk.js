import { useCallback, useEffect, useState } from "react";
import * as patientApi from "../api/patientApi";
import * as riskApi from "../api/riskApi";

/**
 * Loads the caregiver's patients together with each one's latest risk
 * profile. A patient with no assessment yet (404) gets `risk: null` instead
 * of failing the whole list.
 *
 * This makes one risk request per patient, since the backend has no combined
 * endpoint. Fine at caregiver scale.
 *
 * Returns { patients, setPatients, loading, error, reload } where each patient is
 * `{ ...patient, risk: riskData | null, assessedAt: ISO string | null }`.
 */
export default function usePatientsWithRisk() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [version,  setVersion]  = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await patientApi.listPatients();
        const results = await Promise.allSettled(
          data.patients.map((patient) => riskApi.getLatestRiskProfile(patient.id))
        );
        if (cancelled) return;
        setPatients(
          data.patients.map((patient, i) => {
            const profile = results[i].status === "fulfilled" ? results[i].value.data.riskProfile : null;
            return { ...patient, risk: profile?.riskData || null, assessedAt: profile?.createdAt || null };
          })
        );
      } catch {
        if (!cancelled) setError("Could not load your patients.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [version]);

  return { patients, setPatients, loading, error, reload };
}

/** Normalised sepsis risk level: "high" | "moderate" | "low" | null. */
export function sepsisLevel(patient) {
  const level = String(patient?.risk?.sepsis_risk || "").toLowerCase();
  return ["high", "moderate", "low"].includes(level) ? level : null;
}

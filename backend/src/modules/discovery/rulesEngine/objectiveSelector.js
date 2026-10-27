const pathwaysConfig = require("./pathways.config");

/**
 * Given the set of active PatientPathway rows (each with .pathwayName and
 * .data.answeredObjectives), returns the next { pathwayName, objectiveKey }
 * that still needs to be asked, or null if everything active is fully answered.
 *
 * Iterates pathways in the order they were activated (oldest first) and,
 * within a pathway, in the objective order defined in pathways.config.js.
 * Legacy pathway utility retained for interpreting and scoring older sessions.
 * The skill-led Render agent now selects questions for new onboarding flows.
 */
function selectNextObjective(activePatientPathways) {
  for (const pp of activePatientPathways) {
    const config = pathwaysConfig[pp.pathwayName];
    if (!config) continue; // unknown pathway name, defensively skip

    const answered = (pp.data && pp.data.answeredObjectives) || {};
    const nextObjective = config.objectives.find(
      (objectiveKey) => !(objectiveKey in answered)
    );

    if (nextObjective) {
      return { pathwayName: pp.pathwayName, objectiveKey: nextObjective };
    }
  }
  return null;
}

module.exports = { selectNextObjective };

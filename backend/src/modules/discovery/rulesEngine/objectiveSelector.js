const pathwaysConfig = require("./pathways.config");

/**
 * Given the set of active PatientPathway rows (each with .pathwayName and
 * .data.answeredObjectives), returns the next { pathwayName, objectiveKey }
 * that still needs to be asked, or null if everything active is fully answered.
 *
 * Iterates pathways in the order they were activated (oldest first) and,
 * within a pathway, in the objective order defined in pathways.config.js.
 * This guarantees deterministic question ordering — OpenAI never picks
 * the order, it only phrases the question for the objective it's given.
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

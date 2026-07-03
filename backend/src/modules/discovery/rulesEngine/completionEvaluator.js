const pathwaysConfig = require("./pathways.config");

/**
 * True if every objective for this pathway has an answer recorded.
 */
function isPathwayComplete(patientPathway) {
  const config = pathwaysConfig[patientPathway.pathwayName];
  if (!config) return true; // unknown pathway, don't block completion on it

  const answered = (patientPathway.data && patientPathway.data.answeredObjectives) || {};
  return config.objectives.every((objectiveKey) => objectiveKey in answered);
}

module.exports = { isPathwayComplete };

const prisma = require("../../config/prismaClient");
const { BadRequestError, NotFoundError } = require("../../errors/AppError");
const agentClient = require("../../services/agentClient.service");
const discoveryService = require("../discovery/discovery.service");

async function getWorkspace(patientId) {
  const [memory, plans, flags] = await Promise.all([
    prisma.agentMemory.findUnique({ where: { patientId } }),
    prisma.carePlan.findMany({ where: { patientId }, include: { checkIns: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { version: "desc" }, take: 20 }),
    prisma.careFlag.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const planConversation = await prisma.carePlanConversation.findFirst({ where: { patientId, status: "OPEN" }, include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } });
  const memoryHistory = await prisma.agentMemoryRevision.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 20 });
  return { memory: memory?.data || null, memoryHistory, plans, flags, planConversation };
}

async function generatePlan(patientId, request, conversationId) {
  const context = await discoveryService.patientContext(patientId);
  const workspace = await getWorkspace(patientId);
  let conversation = conversationId
    ? await prisma.carePlanConversation.findFirst({ where: { id: conversationId, patientId }, include: { messages: { orderBy: { createdAt: "asc" } } } })
    : null;
  if (conversationId && !conversation) throw new NotFoundError("Care plan conversation not found");
  const history = (conversation?.messages || []).map((item) => ({ role: item.role === "CAREGIVER" ? "user" : "assistant", content: item.content }));
  const result = await agentClient.runAgent({
    mode: "care_plan",
    message: request,
    history,
    patientContext: {
      patient: { fullName: context.patient.fullName, age: context.patient.age, gender: context.patient.gender, relationshipToCaregiver: context.patient.relationshipToCaregiver },
      riskProfile: context.riskProfile,
      memory: context.memory,
      currentPlan: context.currentPlan,
      flags: workspace.flags.filter((flag) => flag.status !== "RESOLVED"),
    },
    appContext: {
      approvedGuides: context.approvedGuides,
      recentCheckIns: workspace.plans.flatMap((plan) => plan.checkIns).slice(0, 10).map((item) => item.data),
    },
  });
  if (!conversation) conversation = await prisma.carePlanConversation.create({ data: { patientId } });
  await prisma.carePlanMessage.createMany({ data: [
    { conversationId: conversation.id, role: "CAREGIVER", content: request },
    { conversationId: conversation.id, role: "ASSISTANT", content: result.reply },
  ] });
  await discoveryService.persistAgentUpdates(patientId, result);
  if (!result.plan) return { conversationId: conversation.id, reply: result.reply, plan: null };
  const version = (workspace.plans[0]?.version || 0) + 1;
  const planData = { ...result.plan, tasks: result.plan.tasks.map((task) => ({ ...task, when: task.when || null })), caregiverRest: result.plan.caregiverRest || null, reply: result.reply, agentModel: result.model, createdAt: new Date().toISOString() };
  const plan = await prisma.$transaction(async (tx) => {
    await tx.carePlan.updateMany({ where: { patientId, isCurrent: true }, data: { isCurrent: false } });
    const created = await tx.carePlan.create({ data: { patientId, version, isCurrent: true, title: result.plan.title, issue: result.plan.issue, planData } });
    await tx.carePlanConversation.update({ where: { id: conversation.id }, data: { status: "COMPLETED" } });
    return created;
  });
  const memoryRow = await prisma.agentMemory.findUnique({ where: { patientId } });
  const memoryData = memoryRow?.data || {};
  const handoff = { ...(memoryData.handoff || {}), updatedAt: new Date().toISOString(), currentPlanId: plan.id, currentPlanVersion: plan.version };
  await prisma.agentMemory.update({ where: { patientId }, data: { data: { ...memoryData, handoff } } });
  await prisma.agentMemoryRevision.create({ data: { patientId, data: { handoff, planId: plan.id, planVersion: plan.version } } });
  return { conversationId: conversation.id, reply: result.reply, plan };
}

async function recordCheckIn(patientId, planId, payload) {
  const plan = await prisma.carePlan.findFirst({ where: { id: planId, patientId } });
  if (!plan) throw new NotFoundError("Care plan not found");
  const checkIn = await prisma.carePlanCheckIn.create({ data: { patientId, planId, data: payload } });
  const old = await discoveryService.patientContext(patientId);
  await prisma.agentMemory.upsert({
    where: { patientId },
    create: { patientId, data: { ...old.memory, lastCheckIn: { ...payload, createdAt: checkIn.createdAt.toISOString() } } },
    update: { data: { ...old.memory, lastCheckIn: { ...payload, createdAt: checkIn.createdAt.toISOString() } } },
  });
  await prisma.agentMemoryRevision.create({ data: { patientId, data: { checkIn: payload, planId, createdAt: checkIn.createdAt.toISOString() } } });
  return checkIn;
}

async function listFlags(patientId) {
  return prisma.careFlag.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } });
}

async function resolveFlag(flagId, patientId, outcome) {
  const flag = await prisma.careFlag.findFirst({ where: { id: flagId, patientId } });
  if (!flag) throw new NotFoundError("Care flag not found");
  return prisma.careFlag.update({ where: { id: flagId }, data: { status: "RESOLVED", outcome, resolvedAt: new Date() } });
}

async function updateFlag(flagId, patientId, payload) {
  const flag = await prisma.careFlag.findFirst({ where: { id: flagId, patientId } });
  if (!flag) throw new NotFoundError("Care flag not found");
  const resolvedAt = payload.status === "RESOLVED" ? new Date() : null;
  return prisma.careFlag.update({ where: { id: flagId }, data: { status: payload.status, outcome: payload.outcome || flag.outcome, resolvedAt } });
}

module.exports = { getWorkspace, generatePlan, recordCheckIn, listFlags, resolveFlag, updateFlag };

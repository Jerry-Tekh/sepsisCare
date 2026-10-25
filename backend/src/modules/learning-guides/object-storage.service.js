const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("node:crypto");
const env = require("../../config/env");
const { AppError } = require("../../errors/AppError");

let client;

function getClient() {
  if (!env.objectStorageBucket) {
    throw new AppError("PDF storage is not configured. Set the object storage environment variables.", 503);
  }
  if (!client) {
    const credentials = env.objectStorageAccessKeyId && env.objectStorageSecretAccessKey
      ? { accessKeyId: env.objectStorageAccessKeyId, secretAccessKey: env.objectStorageSecretAccessKey }
      : undefined;
    client = new S3Client({
      region: env.objectStorageRegion,
      endpoint: env.objectStorageEndpoint || undefined,
      forcePathStyle: Boolean(env.objectStorageEndpoint),
      credentials,
    });
  }
  return client;
}

function createObjectKey(organizationId) {
  return `organizations/${organizationId}/learning-guides/${randomUUID()}.pdf`;
}

async function putPdf(key, buffer, originalName) {
  await getClient().send(new PutObjectCommand({
    Bucket: env.objectStorageBucket,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
    ContentDisposition: `attachment; filename="${originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)}"`,
    // AWS S3 supports this header; S3-compatible providers often reject it.
    ...(env.objectStorageEndpoint ? {} : { ServerSideEncryption: "AES256" }),
  }));
}

async function deleteObject(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.objectStorageBucket, Key: key }));
}

async function createPdfUrl(key, originalName, download = false) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "learning-guide.pdf";
  const disposition = `${download ? "attachment" : "inline"}; filename="${safeName}"`;
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: env.objectStorageBucket,
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: 300 }
  );
}

module.exports = { createObjectKey, putPdf, deleteObject, createPdfUrl };

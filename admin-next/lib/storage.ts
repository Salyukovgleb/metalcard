import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function asBool(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function s3Enabled(): boolean {
  return asBool(process.env.USE_S3_MEDIA, false) || (process.env.MEDIA_STORAGE ?? "").trim().toLowerCase() === "s3";
}

function s3Bucket(): string {
  return (
    process.env.S3_BUCKET ?? process.env.AWS_STORAGE_BUCKET_NAME ?? process.env.AWS_BUCKET_NAME ?? ""
  ).trim();
}

function s3Endpoint(): string {
  return (
    process.env.S3_ENDPOINT_URL ?? process.env.AWS_S3_ENDPOINT_URL ?? process.env.AWS_ENDPOINT_URL ?? ""
  ).trim();
}

function s3ForcePathStyle(): boolean {
  const explicit = process.env.S3_FORCE_PATH_STYLE;
  if (typeof explicit === "string") {
    return asBool(explicit, true);
  }

  return (process.env.AWS_S3_ADDRESSING_STYLE ?? "path").trim() === "path";
}

function createS3Client(): S3Client {
  const accessKeyId = (process.env.S3_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.S3_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "").trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials are not configured");
  }

  const endpoint = s3Endpoint();
  if (!endpoint) {
    throw new Error("S3 endpoint is not configured");
  }

  return new S3Client({
    region: (process.env.S3_REGION ?? process.env.AWS_S3_REGION_NAME ?? "us-east-1").trim(),
    endpoint,
    forcePathStyle: s3ForcePathStyle(),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function buildS3PublicUrl(key: string): string {
  const explicitPublicBase = (process.env.S3_PUBLIC_BASE_URL ?? process.env.MEDIA_CDN_URL ?? "").trim();
  if (explicitPublicBase) {
    return `${normalizeBaseUrl(explicitPublicBase)}/${key}`;
  }

  const endpoint = normalizeBaseUrl(s3Endpoint());
  const bucket = s3Bucket();
  if (!endpoint || !bucket) {
    return key;
  }

  if (s3ForcePathStyle()) {
    return `${endpoint}/${bucket}/${key}`;
  }

  const withoutScheme = endpoint.replace(/^https?:\/\//, "");
  return `https://${bucket}.${withoutScheme}/${key}`;
}

async function uploadSvgToS3(file: File): Promise<string> {
  const bucket = s3Bucket();
  if (!bucket) {
    throw new Error("S3 bucket is not configured");
  }

  const prefix = (process.env.S3_PREFIX ?? process.env.AWS_LOCATION ?? "media").replace(/^\/+|\/+$/g, "");
  const filename = `${crypto.randomUUID()}.svg`;
  const key = `${prefix}/designs/${filename}`;

  const body = Buffer.from(await file.arrayBuffer());
  const client = createS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/svg+xml",
    }),
  );

  return buildS3PublicUrl(key);
}

async function uploadSvgLocally(file: File): Promise<string> {
  const filename = `${crypto.randomUUID()}.svg`;
  const targetDir = path.resolve(process.cwd(), "public", "uploads", "designs");
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/designs/${filename}`;
}

export async function uploadSvg(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".svg")) {
    throw new Error("Требуется SVG файл");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("SVG файл больше 5MB");
  }

  if (s3Enabled()) {
    return uploadSvgToS3(file);
  }

  return uploadSvgLocally(file);
}

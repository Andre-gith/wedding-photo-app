import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { nanoid } from "nanoid";

// Funciona com qualquer storage compat\u00edvel com S3: AWS S3, Cloudflare R2, Backblaze B2.
// Pra Cloudflare R2 (mais barato pra esse caso de uso): endpoint = https://<account_id>.r2.cloudflarestorage.com
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});

const BUCKET = process.env.S3_BUCKET as string;
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL as string; // ex: https://fotos.suacdn.com

interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export async function processAndUploadPhoto(
  buffer: Buffer,
  eventSlug: string
): Promise<UploadResult> {
  const id = nanoid(10);

  const original = sharp(buffer).rotate();
  const metadata = await original.metadata();

  const fullBuffer = await original
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 500, height: 500, fit: "cover" })
    .jpeg({ quality: 70 })
    .toBuffer();

  const fullKey = `events/${eventSlug}/full/${id}.jpg`;
  const thumbKey = `events/${eventSlug}/thumb/${id}.jpg`;

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fullKey,
        Body: fullBuffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    ),
  ]);

  return {
    imageUrl: `${PUBLIC_BASE_URL}/${fullKey}`,
    thumbnailUrl: `${PUBLIC_BASE_URL}/${thumbKey}`,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

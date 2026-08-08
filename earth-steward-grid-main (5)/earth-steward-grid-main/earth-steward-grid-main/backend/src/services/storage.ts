import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const s3Client = useS3
  ? new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  if (useS3 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    return { url, key };
  } else {
    // Local disk fallback
    ensureLocalDir();
    const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, '_'));
    fs.writeFileSync(filePath, buffer);
    const url = `/uploads/${key.replace(/\//g, '_')}`;
    return { url, key };
  }
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (useS3 && s3Client) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  } else {
    // Local: return direct path
    return `/uploads/${key.replace(/\//g, '_')}`;
  }
}

export function generateS3Key(folder: string, ext: string): string {
  return `${folder}/${uuidv4()}.${ext}`;
}

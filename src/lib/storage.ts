import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "examvault-bucket";
const USE_S3 = !!process.env.AWS_ACCESS_KEY_ID;

export async function uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  if (USE_S3) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
    return `s3://${BUCKET_NAME}/${fileName}`;
  } else {
    // Fallback to local storage
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName.replace(/\//g, '_'));
    fs.writeFileSync(filePath, fileBuffer);
    return `/uploads/${fileName.replace(/\//g, '_')}`;
  }
}

export async function getFileUrl(fileUrl: string): Promise<string> {
  if (USE_S3 && fileUrl.startsWith('s3://')) {
    const key = fileUrl.replace(`s3://${BUCKET_NAME}/`, '');
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } else {
    return fileUrl;
  }
}

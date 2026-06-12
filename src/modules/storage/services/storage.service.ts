import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>("DO_SPACES_ENDPOINT");
    const region = this.configService.get<string>("DO_SPACES_REGION") || "sgp1";
    const accessKeyId = this.configService.get<string>("DO_SPACES_KEY");
    const secretAccessKey = this.configService.get<string>("DO_SPACES_SECRET");

    this.bucketName = this.configService.get<string>("DO_SPACES_BUCKET_NAME");

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn("DO Spaces credentials are not fully configured in .env");
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // DO Spaces requires forcePathStyle for older setups or sometimes custom domains,
      // but usually endpoint covers it. If issues arise, we can set forcePathStyle: false
    });
  }

  /**
   * Uploads a file to DO Spaces
   * @param file The file from multer
   * @param folder Optional folder name (e.g., 'submissions')
   * @returns Object containing fileUrl and fileKey
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = "uploads",
  ): Promise<{ fileUrl: string; fileKey: string }> {
    try {
      const ext = path.extname(file.originalname);
      const fileKey = `${folder}/${uuidv4()}${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read", // Ensure it's publicly readable
      });

      await this.s3Client.send(command);

      // Construct public URL
      const endpoint = this.configService.get<string>("DO_SPACES_ENDPOINT");
      const bucketName = this.bucketName;

      // DO Spaces public URL format: https://[bucketName].[region].digitaloceanspaces.com/[fileKey]
      // Or if endpoint includes region like https://sgp1.digitaloceanspaces.com
      // The reliable way is to parse the endpoint
      const endpointUrl = new URL(endpoint);
      const publicUrl = `https://${bucketName}.${endpointUrl.host}/${fileKey}`;

      return {
        fileUrl: publicUrl,
        fileKey,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to DO Spaces: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a file from DO Spaces
   * @param fileKey The key of the file to delete
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) return;
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Error deleting file from DO Spaces: ${error.message}`);
      // Not throwing error to avoid blocking flows if deletion fails
    }
  }
}

import { google } from "googleapis";
import { env } from "@/lib/env";
function driveClient() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) throw new Error("Google service account credentials are not configured");
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,"\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"]
  });
  return google.drive({ version: "v3", auth });
}
export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime?: string; md5Checksum?: string };
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const drive = driveClient(); const output: DriveFile[] = [];
  async function walk(id: string) {
    let pageToken: string|undefined;
    do {
      const res = await drive.files.list({ q: `'${id}' in parents and trashed=false`,
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,md5Checksum)",
        pageSize: 1000, pageToken, supportsAllDrives: true, includeItemsFromAllDrives: true });
      for (const f of res.data.files ?? []) {
        if (!f.id) continue;
        if (f.mimeType === "application/vnd.google-apps.folder") await walk(f.id);
        else output.push({ id:f.id, name:f.name ?? "unnamed", mimeType:f.mimeType ?? "application/octet-stream",
          modifiedTime:f.modifiedTime ?? undefined, md5Checksum:f.md5Checksum ?? undefined });
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while(pageToken);
  }
  await walk(folderId); return output;
}
export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const drive = driveClient();
  const res = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

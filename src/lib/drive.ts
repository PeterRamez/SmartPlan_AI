import { getGoogleDriveClient } from "@/lib/drive-oauth";
export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime?: string; md5Checksum?: string };
export async function listDriveFiles(folderId: string, lawyerId: string): Promise<DriveFile[]> {
  const drive = await getGoogleDriveClient(lawyerId); const output: DriveFile[] = [];
  async function walk(id: string) {
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({ q: `'${id}' in parents and trashed=false`,
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,md5Checksum)",
        pageSize: 1000, pageToken, supportsAllDrives: true, includeItemsFromAllDrives: true });
      for (const f of res.data.files ?? []) {
        if (!f.id) continue;
        if (f.mimeType === "application/vnd.google-apps.folder") await walk(f.id);
        else output.push({ id: f.id, name: f.name ?? "unnamed", mimeType: f.mimeType ?? "application/octet-stream",
          modifiedTime: f.modifiedTime ?? undefined, md5Checksum: f.md5Checksum ?? undefined });
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }
  await walk(folderId); return output;
}
export async function downloadDriveFile(fileId: string, lawyerId: string): Promise<Buffer> {
  const drive = await getGoogleDriveClient(lawyerId);
  const res = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

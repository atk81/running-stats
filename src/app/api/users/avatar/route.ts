import { NextRequest, NextResponse } from "next/server";
import { AppwriteException, Permission, Role } from "node-appwrite";
import {
  ATTRS,
  BUCKETS,
  COLLECTIONS,
  DATABASE_ID,
} from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function avatarFileId(userId: string): string {
  return `avatar-${userId}`;
}

async function deleteFileIfExists(
  bucketId: string,
  fileId: string,
): Promise<void> {
  const { storage } = getAdminClient();
  try {
    await storage.deleteFile(bucketId, fileId);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        error: "unsupported_media_type",
        detail: `expected jpeg/png/webp, got ${file.type || "unknown"}`,
      },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", detail: `max ${MAX_BYTES} bytes` },
      { status: 413 },
    );
  }

  const ext = MIME_TO_EXT[file.type];
  const fileId = avatarFileId(auth.userId);
  const filename = `${fileId}.${ext}`;
  const { storage, tablesDB } = getAdminClient();

  const upload = new File([file], filename, { type: file.type });
  await deleteFileIfExists(BUCKETS.media, fileId);

  let createdId: string;
  try {
    const created = await storage.createFile(
      BUCKETS.media,
      fileId,
      upload,
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId)),
      ],
    );
    createdId = created.$id;
  } catch (err) {
    console.error("avatar: storage.createFile failed", err);
    return NextResponse.json(
      { error: "avatar_upload_failed" },
      { status: 500 },
    );
  }

  try {
    await tablesDB.updateRow(DATABASE_ID, COLLECTIONS.users, auth.userId, {
      [ATTRS.users.avatarFileId]: createdId,
    });
  } catch (err) {
    console.error("avatar: user doc update failed", err);
    return NextResponse.json(
      { error: "user_doc_update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ avatarFileId: createdId });
}

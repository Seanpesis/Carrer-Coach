import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadRatelimit } from "@/lib/ratelimit";
import { syncUser } from "@/lib/sync-user";
import { embedTexts } from "@/lib/openai";
import { upsertResumeChunks } from "@/lib/pinecone";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function parsePDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFParser = require("pdf2json");
    const parser = new PDFParser(null, 1);
    parser.on("pdfParser_dataError", (err: { parserError: Error }) => reject(err.parserError));
    parser.on("pdfParser_dataReady", () => {
      const raw: string = parser.getRawTextContent();
      resolve(raw.trim());
    });
    parser.parseBuffer(buffer);
  });
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "resumes");
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket("resumes", { public: true });
    if (error) throw new Error(`Failed to create storage bucket: ${error.message}`);
  }
}

function chunkResume(text: string): string[] {
  const sectionPattern = /\n(?=[A-Z][A-Z\s]{3,}(?:\n|:))/g;
  const sections = text.split(sectionPattern).filter((s) => s.trim().length > 20);

  const chunks: string[] = [];
  for (const section of sections) {
    const bullets = section.split(/\n\s*[-•*]\s+/).filter(Boolean);
    let current = "";
    for (const bullet of bullets) {
      const candidate = current ? `${current}\n• ${bullet}` : bullet;
      if (candidate.length > 800 && current) {
        chunks.push(current.trim());
        current = bullet;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.length ? chunks : [text.slice(0, 3000)];
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success } = await uploadRatelimit.limit(userId);
  if (!success) return new Response("Rate limit exceeded", { status: 429 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return new Response("No file provided", { status: 400 });
  if (file.type !== "application/pdf")
    return new Response("Only PDF files are allowed", { status: 400 });
  if (file.size > MAX_FILE_SIZE)
    return new Response("File too large (10MB max)", { status: 400 });

  let internalUserId: string;
  try {
    internalUserId = await syncUser();
  } catch (err) {
    return new Response(`User sync failed: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }

  try {
    await ensureBucket();
  } catch (err) {
    return new Response(`Bucket error: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }

  const fileBuffer = await file.arrayBuffer();

  // Parse PDF text
  let rawText = "";
  try {
    rawText = await parsePDF(Buffer.from(fileBuffer));
  } catch (err) {
    return new Response(`PDF parse failed: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }

  if (!rawText) return new Response("Could not extract text from PDF. Is it a scanned image?", { status: 400 });

  // Upload PDF to Supabase Storage
  const filePath = `${userId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("resumes")
    .upload(filePath, fileBuffer, { contentType: "application/pdf" });

  if (uploadError)
    return new Response(`Storage upload failed: ${uploadError.message}`, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from("resumes").getPublicUrl(filePath);
  const namespace = `${userId}-${Date.now()}`;

  // Save to DB
  const { data: resume, error: dbError } = await supabaseAdmin
    .from("resumes")
    .insert({
      user_id: internalUserId,
      filename: file.name,
      storage_url: urlData.publicUrl,
      pinecone_namespace: namespace,
      raw_text: rawText,
    })
    .select()
    .single();

  if (dbError) return new Response(`Database error: ${dbError.message}`, { status: 500 });

  // Chunk + embed + store in Pinecone (best-effort)
  try {
    const chunks = chunkResume(rawText);
    const embeddings = await embedTexts(chunks);
    await upsertResumeChunks(
      chunks.map((text, i) => ({
        id: `${namespace}-${i}`,
        values: embeddings[i],
        metadata: { text, chunk_index: i },
      })),
      namespace
    );
  } catch (err) {
    console.error("Embedding failed:", err);
    // Resume is saved — embedding failure is non-fatal
  }

  return Response.json({ resumeId: resume.id, namespace });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return Response.json([]);

  const { data } = await supabaseAdmin
    .from("resumes")
    .select("id, filename, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}

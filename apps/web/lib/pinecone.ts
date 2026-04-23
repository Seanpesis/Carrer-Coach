import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? "careercoach-resumes";

export async function getResumeIndex() {
  const existing = await pinecone.listIndexes();
  const exists = existing.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!exists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536, // text-embedding-3-small
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    // Wait for index to be ready
    await new Promise((r) => setTimeout(r, 10000));
  }

  return pinecone.index(INDEX_NAME);
}

export async function queryResumeChunks(
  queryEmbedding: number[],
  namespace: string,
  topK = 5
): Promise<string> {
  try {
    const index = await getResumeIndex();
    const results = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    return results.matches
      .map((m) => (m.metadata?.text as string) ?? "")
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return "";
  }
}

export async function upsertResumeChunks(
  vectors: { id: string; values: number[]; metadata: Record<string, unknown> }[],
  namespace: string
) {
  const index = await getResumeIndex();
  await index.namespace(namespace).upsert(vectors);
}

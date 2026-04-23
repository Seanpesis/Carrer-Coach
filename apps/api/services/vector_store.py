from typing import List
from pinecone import Pinecone
from config import settings

pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)


async def embed_and_store(chunks: List[str], embeddings: List[List[float]], namespace: str):
    vectors = [
        {
            "id": f"{namespace}-{i}",
            "values": embeddings[i],
            "metadata": {"text": chunks[i], "chunk_index": i},
        }
        for i in range(len(chunks))
    ]
    index.upsert(vectors=vectors, namespace=namespace)


async def retrieve_context(query_embedding: List[float], namespace: str, top_k: int = 5) -> str:
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True,
    )
    return "\n\n".join(
        match.metadata["text"]
        for match in results.matches
        if match.metadata and "text" in match.metadata
    )

import os
from typing import List

_GCP_PROJECT = os.environ.get("GCP_PROJECT_ID")
_GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    raise ValueError(
        "GOOGLE_APPLICATION_CREDENTIALS environment variable is required but not set. "
        "Provide a path to a GCP service account JSON key file."
    )
if not _GCP_PROJECT:
    raise ValueError(
        "GCP_PROJECT_ID environment variable is required but not set."
    )

from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

aiplatform.init(project=_GCP_PROJECT, location=_GCP_LOCATION)
_embed_model = TextEmbeddingModel.from_pretrained("text-embedding-004")


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using Vertex AI text-embedding-004.
    Batches up to 250 texts per API call as per Vertex AI limits.
    """
    results: List[List[float]] = []
    batch_size = 250
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        embeddings = _embed_model.get_embeddings(batch)
        results.extend([e.values for e in embeddings])
    return results


async def embed_query(text: str) -> List[float]:
    """Embed a single query string."""
    embeddings = _embed_model.get_embeddings([text])
    return embeddings[0].values

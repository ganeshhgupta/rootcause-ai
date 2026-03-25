import os


def init_langsmith() -> None:
    """Initialize LangSmith tracing if LANGCHAIN_TRACING_V2=true."""
    if os.environ.get("LANGCHAIN_TRACING_V2", "").lower() != "true":
        return
    api_key = os.environ.get("LANGCHAIN_API_KEY")
    if not api_key:
        raise ValueError(
            "LANGCHAIN_API_KEY is required when LANGCHAIN_TRACING_V2=true"
        )
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = api_key
    os.environ["LANGCHAIN_PROJECT"] = os.environ.get("LANGCHAIN_PROJECT", "rootcause-ai")


def get_run_url(run_id: str) -> str:
    project = os.environ.get("LANGCHAIN_PROJECT", "rootcause-ai")
    return f"https://smith.langchain.com/public/{run_id}/r?project={project}"

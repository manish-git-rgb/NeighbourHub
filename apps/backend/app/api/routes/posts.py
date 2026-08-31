from fastapi import APIRouter

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("/health")
def posts_health():
    return {"status": "posts route ok"}

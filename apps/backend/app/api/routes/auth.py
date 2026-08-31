from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/health")
def auth_health():
    return {"status": "auth route ok"}

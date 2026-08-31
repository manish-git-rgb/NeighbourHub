from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.posts import router as posts_router
from app.api.routes.users import router as users_router


app = FastAPI(title="NeighborHub API")


app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    posts_router,
    prefix="/api/v1",
)

app.include_router(
    users_router,
    prefix="/api/v1",
)


@app.get("/")
def root():
    return {"message": "NeighborHub API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
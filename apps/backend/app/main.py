from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.posts import router as posts_router
from app.api.routes.users import router as users_router
from app.api.routes.neighborhoods import router as neighborhoods_router
from app.api.routes.events import router as events_router
from app.api.routes.places import router as places_router
from app.api.routes.service_providers import router as service_providers_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.lost_found import router as lost_found_router
from app.api.routes.issue_reports import router as issue_reports_router
from app.api.routes.comments import router as comments_router
from app.api.routes.reactions import router as reactions_router
from app.api.routes.moderation import router as moderation_router

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

app.include_router(
    neighborhoods_router,
    prefix="/api/v1",
)

app.include_router(
    places_router,
    prefix="/api/v1",
)

app.include_router(
    events_router,
    prefix="/api/v1",
)

app.include_router(
    service_providers_router,
    prefix="/api/v1",
)

app.include_router(
    recommendations_router,
    prefix="/api/v1",
)

app.include_router(
    lost_found_router,
    prefix="/api/v1",
)

app.include_router(
    issue_reports_router,
    prefix="/api/v1",
)

app.include_router(
    comments_router,
    prefix="/api/v1",
)

app.include_router(
    reactions_router,
    prefix="/api/v1",
)

app.include_router(
    moderation_router,
    prefix="/api/v1",
)



@app.get("/")
def root():
    return {"message": "NeighborHub API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
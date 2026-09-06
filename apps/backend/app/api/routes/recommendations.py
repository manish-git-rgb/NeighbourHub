from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.recommendation import (
    RecommendationCreate,
    RecommendationListResponse,
    RecommendationResponse,
    RecommendationUpdate,
)
from app.services.recommendation_service import (
    create_recommendation,
    delete_recommendation,
    get_recommendation,
    get_recommendations,
    update_recommendation,
)


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


@router.post(
    "/",
    response_model=RecommendationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_recommendation(
    recommendation_data: RecommendationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_recommendation(
        db=db,
        user_id=current_user.id,
        recommendation_data=recommendation_data,
    )


@router.get(
    "/",
    response_model=RecommendationListResponse,
)
def list_recommendations(
    place_id: int = Query(..., ge=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    recommendations, total = get_recommendations(
        db=db,
        place_id=place_id,
        page=page,
        limit=limit,
    )

    return {
        "success": True,
        "data": recommendations,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


@router.get(
    "/{recommendation_id}",
    response_model=RecommendationResponse,
)
def get_single_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
):
    return get_recommendation(
        db=db,
        recommendation_id=recommendation_id,
    )


@router.patch(
    "/{recommendation_id}",
    response_model=RecommendationResponse,
)
def update_existing_recommendation(
    recommendation_id: int,
    recommendation_data: RecommendationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_recommendation(
        db=db,
        recommendation_id=recommendation_id,
        user_id=current_user.id,
        recommendation_data=recommendation_data,
    )


@router.delete(
    "/{recommendation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_recommendation(
        db=db,
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )

    return None
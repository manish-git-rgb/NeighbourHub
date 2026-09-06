from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.place import Place
from app.models.recommendation import Recommendation
from app.schemas.recommendation import (
    RecommendationCreate,
    RecommendationUpdate,
)


def create_recommendation(
    db: Session,
    user_id: int,
    recommendation_data: RecommendationCreate,
) -> Recommendation:

    place = (
        db.query(Place)
        .filter(Place.id == recommendation_data.place_id)
        .first()
    )

    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found",
        )

    recommendation = Recommendation(
        user_id=user_id,
        place_id=recommendation_data.place_id,
        content=recommendation_data.content,
        rating=recommendation_data.rating,
    )

    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    return recommendation


def get_recommendations(
    db: Session,
    place_id: int,
    page: int = 1,
    limit: int = 20,
):
    offset = (page - 1) * limit

    total = (
        db.query(Recommendation)
        .filter(Recommendation.place_id == place_id)
        .count()
    )

    recommendations = (
        db.query(Recommendation)
        .filter(Recommendation.place_id == place_id)
        .order_by(Recommendation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return recommendations, total


def get_recommendation(
    db: Session,
    recommendation_id: int,
) -> Recommendation:

    recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.id == recommendation_id)
        .first()
    )

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return recommendation


def update_recommendation(
    db: Session,
    recommendation_id: int,
    user_id: int,
    recommendation_data: RecommendationUpdate,
) -> Recommendation:

    recommendation = get_recommendation(
        db,
        recommendation_id,
    )

    if recommendation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this recommendation",
        )

    if recommendation_data.content is not None:
        recommendation.content = recommendation_data.content

    if recommendation_data.rating is not None:
        recommendation.rating = recommendation_data.rating

    db.commit()
    db.refresh(recommendation)

    return recommendation


def delete_recommendation(
    db: Session,
    recommendation_id: int,
    user_id: int,
) -> None:

    recommendation = get_recommendation(
        db,
        recommendation_id,
    )

    if recommendation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this recommendation",
        )

    db.delete(recommendation)
    db.commit()
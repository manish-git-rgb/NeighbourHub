from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user_neighborhood import UserNeighborhood
from app.models.neighborhood import Neighborhood
from app.schemas.neighborhood import NeighborhoodCreate


def create_neighborhood(
    db: Session,
    neighborhood_data: NeighborhoodCreate,
) -> Neighborhood:
    existing_name = (
        db.query(Neighborhood)
        .filter(Neighborhood.name == neighborhood_data.name)
        .first()
    )

    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Neighborhood name already exists",
        )

    existing_slug = (
        db.query(Neighborhood)
        .filter(Neighborhood.slug == neighborhood_data.slug)
        .first()
    )

    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Neighborhood slug already exists",
        )

    neighborhood = Neighborhood(
        name=neighborhood_data.name,
        slug=neighborhood_data.slug,
        description=neighborhood_data.description,
        city=neighborhood_data.city,
        state=neighborhood_data.state,
        country=neighborhood_data.country,
    )

    db.add(neighborhood)
    db.commit()
    db.refresh(neighborhood)

    return neighborhood


def get_neighborhoods(
    db: Session,
) -> list[Neighborhood]:
    return (
        db.query(Neighborhood)
        .order_by(Neighborhood.name.asc())
        .all()
    )


def join_neighborhood(
    db: Session,
    user_id: int,
    neighborhood_id: int,
) -> UserNeighborhood:

    neighborhood = (
        db.query(Neighborhood)
        .filter(Neighborhood.id == neighborhood_id)
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )

    existing_membership = (
        db.query(UserNeighborhood)
        .filter(
            UserNeighborhood.user_id == user_id,
            UserNeighborhood.neighborhood_id == neighborhood_id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already a member of this neighborhood",
        )

    membership = UserNeighborhood(
        user_id=user_id,
        neighborhood_id=neighborhood_id,
        is_primary=False,
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return membership

def leave_neighborhood(
    db: Session,
    user_id: int,
    neighborhood_id: int,
) -> None:

    membership = (
        db.query(UserNeighborhood)
        .filter(
            UserNeighborhood.user_id == user_id,
            UserNeighborhood.neighborhood_id == neighborhood_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood membership not found",
        )

    db.delete(membership)
    db.commit()



def get_user_neighborhoods(
    db: Session,
    user_id: int,
) -> list[UserNeighborhood]:

    return (
        db.query(UserNeighborhood)
        .filter(UserNeighborhood.user_id == user_id)
        .order_by(UserNeighborhood.joined_at.desc())
        .all()
    )
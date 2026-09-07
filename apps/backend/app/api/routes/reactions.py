from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.reaction import (
    ReactionCreate,
    ReactionListResponse,
    ReactionResponse,
)
from app.services.reaction_service import (
    create_reaction,
    delete_reaction,
    get_reactions,
)


router = APIRouter(
    prefix="/reactions",
    tags=["Reactions"],
)


@router.post(
    "/",
    response_model=ReactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_reaction(
    reaction_data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_reaction(
        db=db,
        user_id=current_user.id,
        reaction_data=reaction_data,
    )


@router.get(
    "/",
    response_model=ReactionListResponse,
)
def list_reactions(
    post_id: int = Query(..., ge=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    reactions, total = get_reactions(
        db=db,
        post_id=post_id,
        page=page,
        limit=limit,
    )

    return {
        "success": True,
        "data": reactions,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


@router.delete(
    "/{reaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_reaction(
    reaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_reaction(
        db=db,
        reaction_id=reaction_id,
        user_id=current_user.id,
    )

    return None
from fastapi import APIRouter, Response, status

from mynote.api.dependencies import CategoryServiceDep
from mynote.schemas.category import CategoryCreate, CategoryOut

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(service: CategoryServiceDep) -> list[CategoryOut]:
    return [CategoryOut.from_doc(doc) for doc in await service.list_categories()]


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(body: CategoryCreate, service: CategoryServiceDep) -> CategoryOut:
    return CategoryOut.from_doc(await service.create_category(body.name))


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str, service: CategoryServiceDep) -> Response:
    """Delete a category and all of its notes (confirmation is a client responsibility)."""
    await service.delete_category(category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

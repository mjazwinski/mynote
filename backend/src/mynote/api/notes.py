from fastapi import APIRouter, Response, status

from mynote.api.dependencies import NoteServiceDep
from mynote.schemas.note import NoteCreate, NoteOrder, NoteOut, NoteUpdate

router = APIRouter(tags=["notes"])


@router.get("/categories/{category_id}/notes", response_model=list[NoteOut])
async def list_notes(category_id: str, service: NoteServiceDep) -> list[NoteOut]:
    return [NoteOut.from_doc(doc) for doc in await service.list_notes(category_id)]


@router.post(
    "/categories/{category_id}/notes",
    response_model=NoteOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    category_id: str, service: NoteServiceDep, body: NoteCreate | None = None
) -> NoteOut:
    content = body.content if body else ""
    return NoteOut.from_doc(await service.create_note(category_id, content))


@router.put("/categories/{category_id}/notes/order", response_model=list[NoteOut])
async def reorder_notes(
    category_id: str, body: NoteOrder, service: NoteServiceDep
) -> list[NoteOut]:
    return [
        NoteOut.from_doc(doc) for doc in await service.reorder_notes(category_id, body.note_ids)
    ]


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(note_id: str, body: NoteUpdate, service: NoteServiceDep) -> NoteOut:
    return NoteOut.from_doc(await service.update_note(note_id, body.content))


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, service: NoteServiceDep) -> Response:
    await service.delete_note(note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

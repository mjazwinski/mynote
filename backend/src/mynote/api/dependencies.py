from typing import Annotated

from fastapi import Depends

from mynote.db import Database, get_db
from mynote.repositories.categories import CategoryRepository
from mynote.repositories.notes import NoteRepository
from mynote.services.category_service import CategoryService
from mynote.services.note_service import NoteService

DbDep = Annotated[Database, Depends(get_db)]


def get_category_service(db: DbDep) -> CategoryService:
    return CategoryService(CategoryRepository(db), NoteRepository(db))


def get_note_service(db: DbDep) -> NoteService:
    return NoteService(CategoryRepository(db), NoteRepository(db))


CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]

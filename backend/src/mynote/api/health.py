from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from mynote.db import Database, get_db, ping

router = APIRouter(tags=["health"])


@router.get("/health")
async def get_health(db: Annotated[Database, Depends(get_db)]) -> JSONResponse:
    if await ping(db):
        return JSONResponse({"status": "ok"})
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable", "code": "database_unavailable"},
    )

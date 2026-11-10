from datetime import datetime
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from backend.models import (
    SubnetCalculateRequest,
    SubnetCalculateResponse,
    VLSMAllocateRequest,
    VLSMAllocateResponse,
    AllocationCreate,
    AllocationSummary,
    AllocationDetail,
    DashboardStatsResponse,
    HealthResponse
)
from backend.subnet_calculator import calculate_subnet
from backend.vlsm_allocator import allocate_vlsm
from backend.database import (
    init_db,
    save_allocation,
    list_allocations,
    get_allocation_by_id,
    delete_allocation_by_id,
    get_dashboard_stats
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="IP Allocator API",
    description="Automated IPv4 Subnetting and VLSM Allocation Engine for Computer Networks",
    version="1.0.0",
    lifespan=lifespan
)

# Also ensure DB is initialized
init_db()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def get_health():
    """Returns backend health status and current timestamp."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/subnet/calculate", response_model=SubnetCalculateResponse, tags=["Subnet Calculator"])
def calculate_subnet_endpoint(req: SubnetCalculateRequest):
    """Calculates comprehensive subnet metrics for IPv4 address and CIDR prefix."""
    try:
        result = calculate_subnet(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Calculation error: {str(e)}")

@app.post("/api/vlsm/allocate", response_model=VLSMAllocateResponse, tags=["VLSM Allocator"])
def allocate_vlsm_endpoint(req: VLSMAllocateRequest):
    """Executes Variable Length Subnet Masking (VLSM) allocation for department host requirements."""
    try:
        result = allocate_vlsm(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Allocation error: {str(e)}")

@app.get("/api/dashboard/stats", response_model=DashboardStatsResponse, tags=["Dashboard"])
def get_dashboard_stats_endpoint():
    """Returns aggregated allocation statistics and recent activity for the dashboard."""
    try:
        return get_dashboard_stats()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.get("/api/allocations", response_model=List[AllocationSummary], tags=["History"])
def get_allocations_endpoint():
    """Retrieves all saved allocation sessions."""
    try:
        return list_allocations()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/allocations", status_code=status.HTTP_201_CREATED, tags=["History"])
def save_allocation_endpoint(payload: AllocationCreate):
    """Saves a completed VLSM allocation session into the SQLite database."""
    try:
        new_id = save_allocation(payload)
        return {"id": new_id, "message": "Allocation session saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.get("/api/allocations/{alloc_id}", response_model=AllocationDetail, tags=["History"])
def get_allocation_detail_endpoint(alloc_id: int):
    """Retrieves full details of a saved allocation session by id."""
    detail = get_allocation_by_id(alloc_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation session with ID {alloc_id} not found."
        )
    return detail

import os
from fastapi.staticfiles import StaticFiles

@app.delete("/api/allocations/{alloc_id}", tags=["History"])
def delete_allocation_endpoint(alloc_id: int):
    """Deletes a saved allocation session by id."""
    success = delete_allocation_by_id(alloc_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation session with ID {alloc_id} not found."
        )
    return {"message": f"Allocation session {alloc_id} deleted successfully"}

# If frontend build exists, mount it to serve full single-process app
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")



from typing import List, Optional
from pydantic import BaseModel, Field

# --- Subnet Calculator Models ---

class SubnetCalculateRequest(BaseModel):
    ip_address: str = Field(..., description="IPv4 address or network address, e.g. 192.168.1.10")
    cidr: int = Field(..., ge=0, le=32, description="CIDR prefix length (0-32)")
    strict: bool = Field(False, description="Strict network address validation (host bits must be 0 if True)")

class SubnetCalculateResponse(BaseModel):
    ip_address: str
    cidr: int
    cidr_notation: str
    network_address: str
    subnet_mask: str
    wildcard_mask: str
    broadcast_address: str
    first_usable_host: str
    last_usable_host: str
    total_addresses: int
    usable_hosts: int
    ip_class: str
    is_private: bool
    scope: str
    ip_binary: str
    subnet_mask_binary: str
    network_address_binary: str
    notes: Optional[str] = None

# --- VLSM Allocator Models ---

class DepartmentRequirement(BaseModel):
    name: str = Field(..., min_length=1, description="Department or subnet name")
    hosts_needed: int = Field(..., gt=0, description="Number of required usable hosts")

class VLSMAllocateRequest(BaseModel):
    base_network: str = Field(..., description="Base IPv4 network in CIDR notation, e.g. 192.168.1.0/24")
    departments: List[DepartmentRequirement] = Field(..., min_length=1, description="List of department host requirements")

class VLSMAllocationItem(BaseModel):
    name: str
    required_hosts: int
    allocated_hosts: int
    total_addresses: int
    network_address: str
    cidr: str
    prefix: int
    subnet_mask: str
    wildcard_mask: str
    broadcast_address: str
    first_usable_ip: str
    last_usable_ip: str
    start_ip_int: int
    end_ip_int: int

class VLSMUnusedSubnet(BaseModel):
    cidr_block: str
    network_address: str
    prefix: int
    total_addresses: int
    usable_hosts: int
    subnet_mask: str
    start_ip_int: int
    end_ip_int: int

class VLSMAllocateResponse(BaseModel):
    base_network: str
    base_network_address: str
    base_prefix: int
    base_subnet_mask: str
    base_broadcast_address: str
    total_base_addresses: int
    total_allocated_addresses: int
    total_remaining_addresses: int
    total_required_hosts: int
    total_usable_allocated: int
    network_utilization_pct: float
    allocations: List[VLSMAllocationItem]
    unused_subnets: List[VLSMUnusedSubnet]

# --- Database / Saved Allocation Models ---

class AllocationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120, description="Session title or label")
    description: Optional[str] = Field(None, max_length=500)
    base_network: str
    departments: List[DepartmentRequirement]
    result: VLSMAllocateResponse

class AllocationSummary(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    base_network: str
    department_count: int
    total_allocated_ips: int
    total_base_ips: int
    network_utilization_pct: float
    created_at: str

class AllocationDetail(AllocationSummary):
    departments_json: str
    result_json: str

# --- Dashboard Stats Models ---

class RecentActivityItem(BaseModel):
    id: int
    title: str
    base_network: str
    created_at: str
    department_count: int
    network_utilization_pct: float

class DashboardStatsResponse(BaseModel):
    total_saved_sessions: int
    total_allocated_subnets: int
    total_allocated_ips: int
    remaining_ips_selected_network: int
    selected_network: Optional[str] = None
    network_utilization_pct: float
    recent_activity: List[RecentActivityItem]

# --- Health Model ---

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


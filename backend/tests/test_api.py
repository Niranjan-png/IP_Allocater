import pytest
from fastapi import HTTPException
from backend.main import (
    get_health,
    calculate_subnet_endpoint,
    allocate_vlsm_endpoint,
    save_allocation_endpoint,
    get_allocation_detail_endpoint,
    get_allocations_endpoint,
    delete_allocation_endpoint,
    get_dashboard_stats_endpoint
)
from backend.models import (
    SubnetCalculateRequest,
    VLSMAllocateRequest,
    DepartmentRequirement,
    AllocationCreate
)

def test_health_endpoint():
    res = get_health()
    assert res.status == "healthy"
    assert res.version == "1.0.0"

def test_subnet_calculate_api():
    req = SubnetCalculateRequest(
        ip_address="192.168.1.1",
        cidr=24,
        strict=False
    )
    res = calculate_subnet_endpoint(req)
    assert res.network_address == "192.168.1.0"
    assert res.usable_hosts == 254
    assert res.is_private is True

def test_subnet_calculate_invalid_api():
    # Calling with invalid IP triggers 400 HTTPException
    with pytest.raises(HTTPException) as exc_info:
        calculate_subnet_endpoint(SubnetCalculateRequest(ip_address="not.an.ip.address", cidr=24))
    assert exc_info.value.status_code == 400
    assert "not a valid IPv4 address" in exc_info.value.detail

def test_vlsm_allocate_api():
    req = VLSMAllocateRequest(
        base_network="192.168.1.0/24",
        departments=[
            DepartmentRequirement(name="Engineering", hosts_needed=100),
            DepartmentRequirement(name="HR", hosts_needed=50),
            DepartmentRequirement(name="Management", hosts_needed=20)
        ]
    )
    res = allocate_vlsm_endpoint(req)
    assert len(res.allocations) == 3
    assert res.allocations[0].name == "Engineering"
    assert res.allocations[0].cidr == "/25"
    assert res.unused_subnets[0].cidr_block == "192.168.1.224/27"

def test_allocation_persistence_flow():
    # 1. Allocate VLSM
    alloc_req = VLSMAllocateRequest(
        base_network="10.0.0.0/24",
        departments=[
            DepartmentRequirement(name="HQ", hosts_needed=60),
            DepartmentRequirement(name="Branch", hosts_needed=25)
        ]
    )
    vlsm_res = allocate_vlsm_endpoint(alloc_req)
    
    # 2. Save allocation session
    save_payload = AllocationCreate(
        title="Corporate Office Plan",
        description="Subnet plan for HQ and Branch",
        base_network="10.0.0.0/24",
        departments=alloc_req.departments,
        result=vlsm_res
    )
    save_res = save_allocation_endpoint(save_payload)
    assert "id" in save_res
    saved_id = save_res["id"]
    
    # 3. Retrieve by ID
    detail = get_allocation_detail_endpoint(saved_id)
    assert detail.title == "Corporate Office Plan"
    assert detail.base_network == "10.0.0.0/24"
    assert detail.department_count == 2
    
    # 4. List allocations
    all_items = get_allocations_endpoint()
    assert any(item.id == saved_id for item in all_items)
    
    # 5. Dashboard stats reflect saved session
    stats = get_dashboard_stats_endpoint()
    assert stats.total_saved_sessions >= 1
    assert stats.total_allocated_subnets >= 2
    
    # 6. Delete allocation
    del_res = delete_allocation_endpoint(saved_id)
    assert "deleted successfully" in del_res["message"]
    
    # 7. Confirm 404 after deletion
    with pytest.raises(HTTPException) as exc_info:
        get_allocation_detail_endpoint(saved_id)
    assert exc_info.value.status_code == 404

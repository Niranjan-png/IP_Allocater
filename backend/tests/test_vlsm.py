import pytest
from backend.models import VLSMAllocateRequest, DepartmentRequirement
from backend.vlsm_allocator import allocate_vlsm

def test_vlsm_prompt_example():
    """
    Tests exact specification from user request:
    Base network: 192.168.1.0/24
    Departments: Engineering: 100 hosts, HR: 50 hosts, Management: 20 hosts
    Expected:
      Engineering: 192.168.1.0/25
      HR: 192.168.1.128/26
      Management: 192.168.1.192/27
      Remaining range: 192.168.1.224/27
    """
    req = VLSMAllocateRequest(
        base_network="192.168.1.0/24",
        departments=[
            DepartmentRequirement(name="Engineering", hosts_needed=100),
            DepartmentRequirement(name="HR", hosts_needed=50),
            DepartmentRequirement(name="Management", hosts_needed=20)
        ]
    )
    res = allocate_vlsm(req)
    
    assert len(res.allocations) == 3
    
    # 1. Engineering
    eng = res.allocations[0]
    assert eng.name == "Engineering"
    assert eng.network_address == "192.168.1.0"
    assert eng.cidr == "/25"
    assert eng.total_addresses == 128
    assert eng.allocated_hosts == 126
    assert eng.first_usable_ip == "192.168.1.1"
    assert eng.last_usable_ip == "192.168.1.126"
    assert eng.broadcast_address == "192.168.1.127"
    
    # 2. HR
    hr = res.allocations[1]
    assert hr.name == "HR"
    assert hr.network_address == "192.168.1.128"
    assert hr.cidr == "/26"
    assert hr.total_addresses == 64
    assert hr.allocated_hosts == 62
    assert hr.first_usable_ip == "192.168.1.129"
    assert hr.last_usable_ip == "192.168.1.190"
    assert hr.broadcast_address == "192.168.1.191"
    
    # 3. Management
    mgmt = res.allocations[2]
    assert mgmt.name == "Management"
    assert mgmt.network_address == "192.168.1.192"
    assert mgmt.cidr == "/27"
    assert mgmt.total_addresses == 32
    assert mgmt.allocated_hosts == 30
    assert mgmt.first_usable_ip == "192.168.1.193"
    assert mgmt.last_usable_ip == "192.168.1.222"
    assert mgmt.broadcast_address == "192.168.1.223"
    
    # Remaining range: 192.168.1.224/27
    assert len(res.unused_subnets) == 1
    unused = res.unused_subnets[0]
    assert unused.cidr_block == "192.168.1.224/27"
    assert unused.network_address == "192.168.1.224"
    assert unused.total_addresses == 32
    
    # Totals and utilization
    assert res.total_base_addresses == 256
    assert res.total_allocated_addresses == 224
    assert res.total_remaining_addresses == 32
    assert res.network_utilization_pct == 87.5

def test_non_overlapping_subnets():
    """Verifies that no two allocated subnets overlap each other."""
    req = VLSMAllocateRequest(
        base_network="10.0.0.0/22",
        departments=[
            DepartmentRequirement(name="Dev", hosts_needed=300),
            DepartmentRequirement(name="Ops", hosts_needed=150),
            DepartmentRequirement(name="QA", hosts_needed=60),
            DepartmentRequirement(name="Sales", hosts_needed=10),
        ]
    )
    res = allocate_vlsm(req)
    
    for i in range(len(res.allocations)):
        current = res.allocations[i]
        assert current.start_ip_int <= current.end_ip_int
        if i > 0:
            previous = res.allocations[i - 1]
            # Ensure previous ends strictly before current begins
            assert previous.end_ip_int < current.start_ip_int

def test_insufficient_address_space():
    """Ensures meaningful error when department requirements exceed base network."""
    req = VLSMAllocateRequest(
        base_network="192.168.1.0/25", # 128 total IPs
        departments=[
            DepartmentRequirement(name="Campus A", hosts_needed=100), # Needs /25 (128 IPs)
            DepartmentRequirement(name="Campus B", hosts_needed=50)   # Needs /26 (64 IPs) -> fails!
        ]
    )
    with pytest.raises(ValueError, match="Insufficient address space"):
        allocate_vlsm(req)

def test_duplicate_department_names():
    """Ensures duplicate department names are rejected."""
    req = VLSMAllocateRequest(
        base_network="192.168.1.0/24",
        departments=[
            DepartmentRequirement(name="Engineering", hosts_needed=50),
            DepartmentRequirement(name="engineering", hosts_needed=20)
        ]
    )
    with pytest.raises(ValueError, match="Duplicate department name detected"):
        allocate_vlsm(req)

def test_zero_or_negative_hosts():
    """Ensures invalid host counts are caught."""
    with pytest.raises(ValueError):
        DepartmentRequirement(name="Invalid", hosts_needed=0)

    with pytest.raises(ValueError):
        DepartmentRequirement(name="Invalid", hosts_needed=-10)


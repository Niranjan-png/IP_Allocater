import ipaddress
import math
from typing import List, Tuple
from backend.models import (
    VLSMAllocateRequest,
    VLSMAllocateResponse,
    VLSMAllocationItem,
    VLSMUnusedSubnet
)
from backend.validators import validate_base_network, validate_departments

def calculate_required_prefix_and_size(hosts_needed: int) -> Tuple[int, int]:
    """
    Computes smallest power-of-2 subnet size and CIDR prefix length
    needed to accommodate `hosts_needed` usable IPv4 hosts (with network & broadcast).
    """
    # Usable hosts require 2 overhead addresses (network + broadcast)
    total_needed = hosts_needed + 2
    
    # Power of 2 exponent k: 2^k >= total_needed, k >= 2 (prefix <= 30)
    # math.ceil(math.log2(total_needed))
    k = max(2, math.ceil(math.log2(total_needed)))
    block_size = 2 ** k
    prefix = 32 - k
    return prefix, block_size

def allocate_vlsm(req: VLSMAllocateRequest) -> VLSMAllocateResponse:
    """
    Executes Variable Length Subnet Masking (VLSM) allocation.
    1. Validates base network and department host requirements.
    2. Sorts requirements by descending host requirement.
    3. Sequentially allocates aligned, non-overlapping subnet blocks.
    4. Detects address space exhaustion.
    5. Calculates remaining unused subnets and overall utilization.
    """
    base_net = validate_base_network(req.base_network, strict=False)
    validate_departments(req.departments)
    
    # Sort departments descending by host count; secondary sort by name for stability
    sorted_depts = sorted(req.departments, key=lambda d: (-d.hosts_needed, d.name))
    
    current_ip_int = int(base_net.network_address)
    base_end_ip_int = int(base_net.broadcast_address)
    total_base_addresses = base_net.num_addresses
    
    allocations: List[VLSMAllocationItem] = []
    total_required_hosts = 0
    total_usable_allocated = 0
    total_allocated_addresses = 0
    
    for dept in sorted_depts:
        prefix, block_size = calculate_required_prefix_and_size(dept.hosts_needed)
        
        # Check alignment to subnet boundary
        alignment_offset = current_ip_int % block_size
        if alignment_offset != 0:
            current_ip_int += (block_size - alignment_offset)
            
        subnet_end_ip_int = current_ip_int + block_size - 1
        
        # Check if subnet exceeds base network address space
        if subnet_end_ip_int > base_end_ip_int:
            remaining_available = max(0, base_end_ip_int - current_ip_int + 1)
            raise ValueError(
                f"Insufficient address space in base network {base_net}. "
                f"Department '{dept.name}' requires {dept.hosts_needed} hosts (needs /{prefix} block of {block_size} IPs), "
                f"but only {remaining_available} IP addresses remain available."
            )
        
        subnet = ipaddress.IPv4Network((current_ip_int, prefix))
        usable_hosts = block_size - 2
        first_usable = str(subnet.network_address + 1)
        last_usable = str(subnet.broadcast_address - 1)
        
        allocations.append(VLSMAllocationItem(
            name=dept.name,
            required_hosts=dept.hosts_needed,
            allocated_hosts=usable_hosts,
            total_addresses=block_size,
            network_address=str(subnet.network_address),
            cidr=f"/{prefix}",
            prefix=prefix,
            subnet_mask=str(subnet.netmask),
            wildcard_mask=str(subnet.hostmask),
            broadcast_address=str(subnet.broadcast_address),
            first_usable_ip=first_usable,
            last_usable_ip=last_usable,
            start_ip_int=current_ip_int,
            end_ip_int=subnet_end_ip_int
        ))
        
        total_required_hosts += dept.hosts_needed
        total_usable_allocated += usable_hosts
        total_allocated_addresses += block_size
        current_ip_int += block_size

    # Calculate remaining unused subnets
    unused_subnets: List[VLSMUnusedSubnet] = []
    if current_ip_int <= base_end_ip_int:
        summary_ranges = ipaddress.summarize_address_range(
            ipaddress.IPv4Address(current_ip_int),
            ipaddress.IPv4Address(base_end_ip_int)
        )
        for net in summary_ranges:
            usable = 0
            if net.prefixlen <= 30:
                usable = net.num_addresses - 2
            elif net.prefixlen == 31:
                usable = 2
            elif net.prefixlen == 32:
                usable = 1
                
            unused_subnets.append(VLSMUnusedSubnet(
                cidr_block=f"{net.network_address}/{net.prefixlen}",
                network_address=str(net.network_address),
                prefix=net.prefixlen,
                total_addresses=net.num_addresses,
                usable_hosts=usable,
                subnet_mask=str(net.netmask),
                start_ip_int=int(net.network_address),
                end_ip_int=int(net.broadcast_address)
            ))
            
    total_remaining_addresses = total_base_addresses - total_allocated_addresses
    network_utilization_pct = round((total_allocated_addresses / total_base_addresses) * 100, 2)
    
    return VLSMAllocateResponse(
        base_network=str(base_net),
        base_network_address=str(base_net.network_address),
        base_prefix=base_net.prefixlen,
        base_subnet_mask=str(base_net.netmask),
        base_broadcast_address=str(base_net.broadcast_address),
        total_base_addresses=total_base_addresses,
        total_allocated_addresses=total_allocated_addresses,
        total_remaining_addresses=total_remaining_addresses,
        total_required_hosts=total_required_hosts,
        total_usable_allocated=total_usable_allocated,
        network_utilization_pct=network_utilization_pct,
        allocations=allocations,
        unused_subnets=unused_subnets
    )


import ipaddress
from typing import List, Tuple
from backend.models import DepartmentRequirement

def validate_ipv4_address(ip_str: str) -> ipaddress.IPv4Address:
    """Validates that a string is a valid IPv4 address."""
    if not ip_str or not isinstance(ip_str, str):
        raise ValueError("IP address must be a non-empty string.")
    
    clean_ip = ip_str.strip()
    try:
        addr = ipaddress.IPv4Address(clean_ip)
        return addr
    except ipaddress.AddressValueError:
        raise ValueError(f"'{clean_ip}' is not a valid IPv4 address. Must follow dotted-quad format (e.g., 192.168.1.1).")

def validate_cidr_prefix(cidr: int) -> int:
    """Validates that CIDR prefix is an integer between 0 and 32."""
    if not isinstance(cidr, int):
        try:
            cidr = int(cidr)
        except (ValueError, TypeError):
            raise ValueError(f"CIDR prefix must be an integer, got '{cidr}'.")
            
    if cidr < 0 or cidr > 32:
        raise ValueError(f"CIDR prefix /{cidr} is invalid. IPv4 prefix must be between 0 and 32.")
    return cidr

def validate_base_network(base_network: str, strict: bool = False) -> ipaddress.IPv4Network:
    """Validates base network CIDR notation (e.g. 192.168.1.0/24)."""
    if not base_network or not isinstance(base_network, str):
        raise ValueError("Base network must be a non-empty string.")
    
    clean_net = base_network.strip()
    if "/" not in clean_net:
        raise ValueError(f"Base network '{clean_net}' missing CIDR prefix. Example: '192.168.1.0/24'.")
    
    try:
        net = ipaddress.IPv4Network(clean_net, strict=strict)
        return net
    except ipaddress.NetmaskValueError:
        raise ValueError(f"Invalid netmask or prefix length in '{clean_net}'.")
    except ValueError as e:
        if "has host bits set" in str(e):
            raise ValueError(f"Strict validation failed: '{clean_net}' has host bits set. Did you mean the network address?")
        raise ValueError(f"Invalid network string '{clean_net}': {str(e)}")

def validate_departments(departments: List[DepartmentRequirement]) -> None:
    """Validates a list of department host requirements."""
    if not departments:
        raise ValueError("At least one department requirement must be specified.")
    
    names_seen = set()
    for idx, dept in enumerate(departments, start=1):
        clean_name = dept.name.strip()
        if not clean_name:
            raise ValueError(f"Department #{idx} has an empty name.")
        
        lower_name = clean_name.lower()
        if lower_name in names_seen:
            raise ValueError(f"Duplicate department name detected: '{dept.name}'. Department names must be unique.")
        names_seen.add(lower_name)
        
        if dept.hosts_needed <= 0:
            raise ValueError(f"Department '{dept.name}' must require at least 1 host (got {dept.hosts_needed}).")
        if dept.hosts_needed > 2**30:
            raise ValueError(f"Department '{dept.name}' host requirement ({dept.hosts_needed}) exceeds maximum IPv4 subnet capacity.")


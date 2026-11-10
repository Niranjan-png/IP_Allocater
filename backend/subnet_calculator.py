import ipaddress
from typing import Tuple
from backend.models import SubnetCalculateRequest, SubnetCalculateResponse
from backend.validators import validate_ipv4_address, validate_cidr_prefix

def to_binary_dotted(ip_int: int) -> str:
    """Converts a 32-bit integer to an 8-bit dotted binary string."""
    binary_str = f"{ip_int:032b}"
    return f"{binary_str[0:8]}.{binary_str[8:16]}.{binary_str[16:24]}.{binary_str[24:32]}"

def determine_ip_class(first_octet: int) -> str:
    """Returns the historical IPv4 class based on first octet."""
    if 0 <= first_octet <= 127:
        return "Class A"
    elif 128 <= first_octet <= 191:
        return "Class B"
    elif 192 <= first_octet <= 223:
        return "Class C"
    elif 224 <= first_octet <= 239:
        return "Class D (Multicast)"
    elif 240 <= first_octet <= 255:
        return "Class E (Experimental/Reserved)"
    return "Unknown"

def determine_ip_scope(ip: ipaddress.IPv4Address) -> Tuple[bool, str]:
    """Determines if the IP is private and describes its scope."""
    if ip.is_loopback:
        return False, "Loopback (RFC 1122)"
    elif ip.is_link_local:
        return False, "Link-Local / APIPA (RFC 3927)"
    elif ip.is_multicast:
        return False, "Multicast (RFC 5771)"
    elif ip.is_reserved:
        return False, "Reserved (RFC 1112 / Class E)"
    elif ip.is_private:
        return True, "Private (RFC 1918)"
    else:
        return False, "Public Internet"

def calculate_subnet(req: SubnetCalculateRequest) -> SubnetCalculateResponse:
    """Calculates all subnet details for an IPv4 address and CIDR prefix."""
    parsed_ip = validate_ipv4_address(req.ip_address)
    cidr = validate_cidr_prefix(req.cidr)
    
    # Check strict validation if requested
    if req.strict:
        # Strict mode requires host bits to be zero
        net = ipaddress.IPv4Network(f"{parsed_ip}/{cidr}", strict=True)
    else:
        net = ipaddress.IPv4Network(f"{parsed_ip}/{cidr}", strict=False)
    
    first_octet = int(str(parsed_ip).split(".")[0])
    ip_class = determine_ip_class(first_octet)
    is_private, scope = determine_ip_scope(parsed_ip)
    
    total_addresses = net.num_addresses
    prefix = net.prefixlen
    
    notes = None
    if prefix == 32:
        # Single host / host route
        first_usable = str(net.network_address)
        last_usable = str(net.network_address)
        usable_hosts = 1
        notes = "CIDR /32 represents a single host route with 1 usable address."
    elif prefix == 31:
        # RFC 3021 Point-to-Point links
        first_usable = str(net.network_address)
        last_usable = str(net.broadcast_address)
        usable_hosts = 2
        notes = "CIDR /31 uses RFC 3021 for point-to-point links (both addresses are usable hosts)."
    elif prefix == 0:
        # Default route 0.0.0.0/0
        first_usable = "0.0.0.1"
        last_usable = "255.255.255.254"
        usable_hosts = total_addresses - 2
        notes = "CIDR /0 represents the entire IPv4 Internet default route."
    else:
        # Standard subnets /1 through /30
        first_usable = str(net.network_address + 1)
        last_usable = str(net.broadcast_address - 1)
        usable_hosts = total_addresses - 2
    
    # Binary strings
    ip_binary = to_binary_dotted(int(parsed_ip))
    subnet_mask_binary = to_binary_dotted(int(net.netmask))
    network_binary = to_binary_dotted(int(net.network_address))
    
    return SubnetCalculateResponse(
        ip_address=str(parsed_ip),
        cidr=prefix,
        cidr_notation=f"/{prefix}",
        network_address=str(net.network_address),
        subnet_mask=str(net.netmask),
        wildcard_mask=str(net.hostmask),
        broadcast_address=str(net.broadcast_address),
        first_usable_host=first_usable,
        last_usable_host=last_usable,
        total_addresses=total_addresses,
        usable_hosts=usable_hosts,
        ip_class=ip_class,
        is_private=is_private,
        scope=scope,
        ip_binary=ip_binary,
        subnet_mask_binary=subnet_mask_binary,
        network_address_binary=network_binary,
        notes=notes
    )

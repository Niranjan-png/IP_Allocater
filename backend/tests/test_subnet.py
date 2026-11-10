import pytest
from backend.models import SubnetCalculateRequest
from backend.subnet_calculator import calculate_subnet

def test_standard_subnets():
    # /24 subnet test
    req24 = SubnetCalculateRequest(ip_address="192.168.1.10", cidr=24)
    res24 = calculate_subnet(req24)
    assert res24.network_address == "192.168.1.0"
    assert res24.subnet_mask == "255.255.255.0"
    assert res24.broadcast_address == "192.168.1.255"
    assert res24.first_usable_host == "192.168.1.1"
    assert res24.last_usable_host == "192.168.1.254"
    assert res24.total_addresses == 256
    assert res24.usable_hosts == 254
    assert res24.ip_class == "Class C"
    assert res24.is_private is True

    # /26 subnet test
    req26 = SubnetCalculateRequest(ip_address="10.0.0.75", cidr=26)
    res26 = calculate_subnet(req26)
    assert res26.network_address == "10.0.0.64"
    assert res26.subnet_mask == "255.255.255.192"
    assert res26.broadcast_address == "10.0.0.127"
    assert res26.first_usable_host == "10.0.0.65"
    assert res26.last_usable_host == "10.0.0.126"
    assert res26.total_addresses == 64
    assert res26.usable_hosts == 62
    assert res26.ip_class == "Class A"
    assert res26.is_private is True

    # /28 subnet test
    req28 = SubnetCalculateRequest(ip_address="172.16.5.35", cidr=28)
    res28 = calculate_subnet(req28)
    assert res28.network_address == "172.16.5.32"
    assert res28.subnet_mask == "255.255.255.240"
    assert res28.broadcast_address == "172.16.5.47"
    assert res28.first_usable_host == "172.16.5.33"
    assert res28.last_usable_host == "172.16.5.46"
    assert res28.total_addresses == 16
    assert res28.usable_hosts == 14
    assert res28.ip_class == "Class B"
    assert res28.is_private is True

def test_edge_case_31():
    # /31 RFC 3021 point-to-point link
    req = SubnetCalculateRequest(ip_address="192.168.10.4", cidr=31)
    res = calculate_subnet(req)
    assert res.network_address == "192.168.10.4"
    assert res.broadcast_address == "192.168.10.5"
    assert res.first_usable_host == "192.168.10.4"
    assert res.last_usable_host == "192.168.10.5"
    assert res.total_addresses == 2
    assert res.usable_hosts == 2
    assert "RFC 3021" in res.notes

def test_edge_case_32():
    # /32 single host route
    req = SubnetCalculateRequest(ip_address="8.8.8.8", cidr=32)
    res = calculate_subnet(req)
    assert res.network_address == "8.8.8.8"
    assert res.broadcast_address == "8.8.8.8"
    assert res.first_usable_host == "8.8.8.8"
    assert res.last_usable_host == "8.8.8.8"
    assert res.total_addresses == 1
    assert res.usable_hosts == 1
    assert res.is_private is False
    assert res.ip_class == "Class A"

def test_public_and_private_classification():
    # Public Class A
    res_pub = calculate_subnet(SubnetCalculateRequest(ip_address="1.1.1.1", cidr=24))
    assert res_pub.is_private is False
    assert res_pub.scope == "Public Internet"
    assert res_pub.ip_class == "Class A"

    # Multicast Class D
    res_multi = calculate_subnet(SubnetCalculateRequest(ip_address="224.0.0.1", cidr=24))
    assert res_multi.ip_class == "Class D (Multicast)"

    # Experimental Class E
    res_exp = calculate_subnet(SubnetCalculateRequest(ip_address="245.1.2.3", cidr=24))
    assert res_exp.ip_class == "Class E (Experimental/Reserved)"

def test_invalid_ip_and_cidr():
    # Invalid IP address
    with pytest.raises(ValueError, match="not a valid IPv4 address"):
        calculate_subnet(SubnetCalculateRequest(ip_address="999.1.2.3", cidr=24))

    with pytest.raises(ValueError, match="not a valid IPv4 address"):
        calculate_subnet(SubnetCalculateRequest(ip_address="abc.def.ghi.jkl", cidr=24))

    # Invalid CIDR prefix (Pydantic validation ge=0, le=32)
    with pytest.raises(ValueError):
        SubnetCalculateRequest(ip_address="192.168.1.1", cidr=33)

    with pytest.raises(ValueError):
        SubnetCalculateRequest(ip_address="192.168.1.1", cidr=-1)

def test_strict_mode():
    # Strict mode on an IP with host bits set should raise error
    with pytest.raises(ValueError, match="has host bits set"):
        calculate_subnet(SubnetCalculateRequest(ip_address="192.168.1.55", cidr=24, strict=True))
        
    # Strict mode on genuine network address passes
    res = calculate_subnet(SubnetCalculateRequest(ip_address="192.168.1.0", cidr=24, strict=True))
    assert res.network_address == "192.168.1.0"


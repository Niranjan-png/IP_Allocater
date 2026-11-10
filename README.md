# IP Allocator – Automated IP Address Allocation & Subnetting Tool

A modern, full-stack web application developed for Computer Networks academic coursework. The system calculates IPv4 subnet parameters, performs Variable Length Subnet Masking (VLSM) hierarchical allocation, provides visual address space partitioning, and persists network design sessions in a local SQLite database.

---

## Table of Contents
1. [How It Works (Underlying Architecture & Algorithms)](#how-it-works)
   - [Subnet Calculation Logic](#1-subnet-calculation-logic)
   - [VLSM Allocation Algorithm](#2-vlsm-allocation-algorithm)
   - [Database & State Management](#3-database--state-management)
2. [Quick Start (How to Run)](#quick-start-how-to-run)
3. [Step-by-Step User Guide (How to Use & Test All Features)](#step-by-step-user-guide)
   - [Page 1: Subnet Calculator](#page-1-subnet-calculator)
   - [Page 2: VLSM Allocator](#page-2-vlsm-allocator)
   - [Page 3: Network Visualization](#page-3-network-visualization)
   - [Page 4: Allocation History](#page-4-allocation-history)
   - [Page 5: Dashboard](#page-5-dashboard)
4. [Technology Stack](#technology-stack)
5. [Automated Testing & Reliability](#automated-testing--reliability)
6. [REST API Specification](#rest-api-specification)

---

## How It Works

### 1. Subnet Calculation Logic
The Subnet Calculator leverages Python's standard `ipaddress` library alongside bitwise operations:
- **Total Addresses**: Evaluated as $2^{(32 - \text{prefix})}$.
- **Usable Host Capacity**:
  - For standard subnets ($\le /30$): $\text{Total} - 2$ (subtracting 1 Network address and 1 Broadcast address).
  - For **/31 (RFC 3021)**: 2 usable host addresses for point-to-point links (both host addresses are assignable without a dedicated broadcast).
  - For **/32**: 1 usable host (single-host route).
  - For **/0**: $2^{32} - 2$ addresses (default route).
- **Class Determination**: Inspected from the first octet ($0\text{--}127$: Class A, $128\text{--}191$: Class B, $192\text{--}223$: Class C, $224\text{--}239$: Class D Multicast, $240\text{--}255$: Class E Experimental).
- **Scope Detection**: Resolves whether an address is Private (RFC 1918), Loopback (RFC 1122), Link-Local / APIPA (RFC 3927), Multicast, or Public Internet.
- **Strict Network Validation**: Validates that all host bits in the specified IPv4 interface are set to zero. If non-zero host bits exist (e.g. `192.168.1.55/24`), it cleanly reports a boundary error.

---

### 2. VLSM Allocation Algorithm
Variable Length Subnet Masking (VLSM) maximizes IPv4 efficiency by tailoring block sizes to specific department needs rather than fixed-size subnets:

```
[User Input Requirements] ──> [Sort Descending by Host Need]
                                           │
                                           ▼
                             [Find Smallest Power-of-2 Block]
                               (Size = 2^k >= Hosts Needed + 2)
                                           │
                                           ▼
                             [Boundary-Aligned Block Allocation]
                                (Current IP % Block Size == 0)
                                           │
                                           ▼
                             [Exhaustion Check (< Base End)]
                                           │
                                           ▼
                             [Repeat for All Departments]
                                           │
                                           ▼
                             [Summarize Remaining Free Subnets]
```

1. **Host Requirement Overhead**: For $H$ required usable hosts, the engine requires at least $H + 2$ addresses to reserve the network and broadcast addresses.
2. **Power-of-2 Exponent**: Calculates the minimum exponent $k = \lceil \log_2(H + 2) \rceil$ (with $k \ge 2$, meaning prefix $\le 30$). The subnet prefix length is $32 - k$, and block size is $2^k$.
3. **Descending Sort**: Requirements are sorted in descending order of required hosts. This guarantees that large blocks are placed first, naturally preventing fragmentation.
4. **Binary Boundary Alignment**: Each subnet must start on an address that is an exact multiple of its block size (`current_ip % block_size == 0`).
5. **Collision & Overflow Prevention**: If `current_ip + block_size - 1` exceeds the base network's broadcast address, the calculation cleanly aborts and reports the exact shortfall.
6. **Contiguous Unused Range Summarization**: Any leftover address space between the last allocated department and the base broadcast address is converted into valid, maximal CIDR blocks using Python's `ipaddress.summarize_address_range`.

---

### 3. Database & State Management
- **SQLite Database (`backend/allocations.db`)**: Saves sessions with titles, descriptions, base network, department counts, total allocated IPs, utilization percentage, and full JSON payload.
- **Frontend State Sync**: The React frontend uses a central `AllocationContext` so that an allocation created or loaded in one tab is immediately reflected across the **Dashboard**, **VLSM Allocator**, and **Network Visualization**.

---

## Quick Start (How to Run)

Open two terminals in the project root:

### Terminal 1: Backend
```powershell
cd d:\CN_Project
.venv\Scripts\Activate.ps1
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API & Docs: http://127.0.0.1:8000/docs
- Health Status: http://127.0.0.1:8000/api/health

### Terminal 2: Frontend
```powershell
cd d:\CN_Project\frontend
npm run dev
```
- Web Application: **http://localhost:5173**

---

## Step-by-Step User Guide

### Page 1: Subnet Calculator
Navigate to **Subnet Calculator** in the sidebar.

1. **Calculate a Standard Subnet**:
   - Click the **`192.168.1.10/24`** quick example button (or type any IP address and adjust the CIDR slider).
   - Click **Calculate Subnet**.
   - Review calculated metrics: Network (`192.168.1.0`), Broadcast (`192.168.1.255`), Usable range (`192.168.1.1` to `192.168.1.254`), Usable hosts (`254`), Class (`Class C`), and Scope (`Private RFC 1918`).
2. **Copy Individual Values or Full Report**:
   - Click the **Copy** button on any individual tile (e.g. Subnet Mask).
   - Click **Copy Full Report** in the top right to copy a formatted text summary.
3. **Test Point-to-Point Edge Cases (/31 RFC 3021)**:
   - Click the **`172.16.5.4/31`** example button.
   - Note the protocol notice explaining RFC 3021 and showing 2 usable hosts.
4. **Test Strict Validation**:
   - Check the **"Enforce Strict Network Validation"** box with IP `192.168.1.55` and prefix `/24`.
   - Click **Calculate Subnet** to observe the validation error explaining that host bits are set.
5. **Inspect Binary Breakdown**:
   - Scroll down to view the 32-bit dotted-quad binary representation of IP, Subnet Mask, and Network Address.

---

### Page 2: VLSM Allocator
Navigate to **VLSM Allocator** in the sidebar.

1. **Load Benchmark Demo**:
   - Click **Load Standard Demo (192.168.1.0/24)**.
   - It preloads:
     - Engineering: 100 hosts
     - HR: 50 hosts
     - Management: 20 hosts
2. **Calculate Allocation**:
   - Click **Calculate VLSM Allocation**.
   - Inspect the partition table:
     - **Engineering**: `192.168.1.0/25` (128 addresses, 126 usable hosts, range `.1` to `.126`)
     - **HR**: `192.168.1.128/26` (64 addresses, 62 usable hosts, range `.129` to `.190`)
     - **Management**: `192.168.1.192/27` (32 addresses, 30 usable hosts, range `.193` to `.222`)
     - **Unassigned Free Block**: `192.168.1.224/27` (32 free addresses)
     - **Network Utilization**: **87.5%**
3. **Add Custom Departments**:
   - Click **Add Department**.
   - Enter department name and required host count.
   - Re-calculate to see real-time recalculation and boundary alignment.
4. **Test Insufficient Address Space Error**:
   - Change base network to `192.168.1.0/26` (only 64 total addresses) while keeping Engineering (100 hosts).
   - Click **Calculate VLSM Allocation** to view the clear error message.
5. **Export to CSV**:
   - Click **Export CSV** to download a spreadsheet with all subnet boundaries and masks.
6. **Save Session to SQLite**:
   - Click **Save Session**.
   - Enter a title (e.g. *"Campus Network Plan"*) and optional description.
   - Click **Confirm & Save**.

---

### Page 3: Network Visualization
Navigate to **Network Visualization** in the sidebar (or click **Visualize** from the VLSM Allocator).

1. **Contiguous Address Space Strip Map**:
   - View the linear proportional bar representing the root network.
   - Each department is color-coded proportionally according to its address footprint.
   - Hover or click any block to open the **Subnet Block Inspector** displaying capacity, usable range, and mask.
2. **Address Space Allocation Breakdown (Donut Chart)**:
   - Interactive Recharts donut chart detailing the percentage of address space allocated to each department vs. unused free space.
3. **Subnet Partition Cards**:
   - Comprehensive reference cards for routing tables and gateway configurations.

---

### Page 4: Allocation History
Navigate to **Allocation History** in the sidebar.

1. **View Saved Sessions**:
   - Browse sessions saved in SQLite with timestamps, base networks, and utilization badges.
2. **Inspect Saved Session**:
   - Click **View** on any session row to open the inspector dialog.
3. **Load Into Workspace**:
   - Click **Load Into Workspace** inside the modal.
   - The session's base network, department requirements, and calculated subnets will be loaded directly into your active workspace and visualized immediately.
4. **Delete Session**:
   - Click **Delete** to remove a session from the SQLite database.

---

### Page 5: Dashboard
Navigate to **Dashboard** (`/`) in the sidebar.

1. **Live Aggregated Metrics**:
   - Displays real totals calculated from SQLite:
     - Total Allocated Subnets
     - Total Allocated IP Addresses
     - Remaining Free IPs in Selected Network
     - Saved Session Count
2. **Network Utilization Widget**:
   - Interactive visual donut chart showing the overall ratio of allocated vs. free IP addresses.
3. **Recent Activity**:
   - Click any recent allocation session to instantly inspect and visualize it.
4. **Quick Access**:
   - Quick launch buttons for the Subnet Calculator and VLSM Allocator.

---

## Technology Stack

- **Frontend**:
  - React 18 with Vite
  - Tailwind CSS (Linear / Raycast / Vercel-inspired developer dashboard)
  - React Router v6 (SPA routing)
  - Recharts (responsive pie, donut, and bar charts)
  - Lucide React (clean feather icons)
- **Backend**:
  - Python 3.13+
  - FastAPI (REST API framework with automated OpenAPI docs at `/docs`)
  - Python standard library `ipaddress` (IPv4 calculations & boundary summarization)
  - SQLite3 (zero-configuration local persistence)
  - Pydantic v2 (request/response schema validation)
  - Pytest (automated unit tests)

---

## Automated Testing & Reliability

The application includes 16 unit tests covering all calculation engines, edge cases, input validation, and SQLite persistence.

To execute the test suite:
```powershell
cd d:\CN_Project
.venv\Scripts\python.exe -m pytest backend/tests -v
```

### Verified Test Suites:
- `backend/tests/test_subnet.py`: Tests `/24`, `/26`, `/28`, edge cases `/31` RFC 3021 and `/32`, IP class classification (A, B, C, D, E), private/public scopes, and strict mode.
- `backend/tests/test_vlsm.py`: Tests benchmark demo allocation, non-overlapping subnet checks, insufficient address space handling, duplicate department detection, and zero/negative host validation.
- `backend/tests/test_api.py`: Tests all FastAPI endpoints, health check, calculation routes, and full SQLite CRUD lifecycle (create, retrieve, list, stats, delete).

---

## REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & version heartbeat |
| `POST` | `/api/subnet/calculate` | Compute IPv4 subnet parameters & binary representations |
| `POST` | `/api/vlsm/allocate` | Execute VLSM allocation for department host requests |
| `GET` | `/api/dashboard/stats` | Retrieve aggregated allocation metrics & recent sessions |
| `GET` | `/api/allocations` | List all saved allocation sessions in SQLite |
| `POST` | `/api/allocations` | Save an allocation session to SQLite |
| `GET` | `/api/allocations/{id}` | Retrieve full details of a saved session |
| `DELETE` | `/api/allocations/{id}` | Delete a saved session from SQLite |

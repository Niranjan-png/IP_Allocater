import sqlite3
import os
import json
from datetime import datetime
from typing import List, Optional
from backend.models import (
    AllocationCreate,
    AllocationSummary,
    AllocationDetail,
    DashboardStatsResponse,
    RecentActivityItem
)

DB_PATH = os.path.join(os.path.dirname(__file__), "allocations.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite schema."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                base_network TEXT NOT NULL,
                department_count INTEGER NOT NULL,
                total_allocated_ips INTEGER NOT NULL,
                total_base_ips INTEGER NOT NULL,
                network_utilization_pct REAL NOT NULL,
                departments_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.commit()

def save_allocation(item: AllocationCreate) -> int:
    """Saves a VLSM allocation session into SQLite."""
    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    dept_json = json.dumps([d.model_dump() for d in item.departments])
    result_json = json.dumps(item.result.model_dump())
    
    dept_count = len(item.departments)
    total_alloc_ips = item.result.total_allocated_addresses
    total_base_ips = item.result.total_base_addresses
    util_pct = item.result.network_utilization_pct
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO allocations (
                title, description, base_network, department_count,
                total_allocated_ips, total_base_ips, network_utilization_pct,
                departments_json, result_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item.title,
            item.description or "",
            item.base_network,
            dept_count,
            total_alloc_ips,
            total_base_ips,
            util_pct,
            dept_json,
            result_json,
            now_iso
        ))
        conn.commit()
        return cursor.lastrowid

def list_allocations() -> List[AllocationSummary]:
    """Retrieves all saved allocation sessions ordered by latest."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, description, base_network, department_count,
                   total_allocated_ips, total_base_ips, network_utilization_pct, created_at
            FROM allocations
            ORDER BY id DESC
        """)
        rows = cursor.fetchall()
        return [
            AllocationSummary(
                id=row["id"],
                title=row["title"],
                description=row["description"],
                base_network=row["base_network"],
                department_count=row["department_count"],
                total_allocated_ips=row["total_allocated_ips"],
                total_base_ips=row["total_base_ips"],
                network_utilization_pct=row["network_utilization_pct"],
                created_at=row["created_at"]
            )
            for row in rows
        ]

def get_allocation_by_id(alloc_id: int) -> Optional[AllocationDetail]:
    """Retrieves full details of a saved allocation session."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, description, base_network, department_count,
                   total_allocated_ips, total_base_ips, network_utilization_pct,
                   departments_json, result_json, created_at
            FROM allocations
            WHERE id = ?
        """, (alloc_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return AllocationDetail(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            base_network=row["base_network"],
            department_count=row["department_count"],
            total_allocated_ips=row["total_allocated_ips"],
            total_base_ips=row["total_base_ips"],
            network_utilization_pct=row["network_utilization_pct"],
            departments_json=row["departments_json"],
            result_json=row["result_json"],
            created_at=row["created_at"]
        )

def delete_allocation_by_id(alloc_id: int) -> bool:
    """Deletes a saved allocation session by id."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM allocations WHERE id = ?", (alloc_id,))
        conn.commit()
        return cursor.rowcount > 0

def get_dashboard_stats() -> DashboardStatsResponse:
    """Computes real statistics across saved sessions for the dashboard."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Total sessions
        cursor.execute("SELECT COUNT(*) AS total FROM allocations")
        total_sessions = cursor.fetchone()["total"]
        
        if total_sessions == 0:
            return DashboardStatsResponse(
                total_saved_sessions=0,
                total_allocated_subnets=0,
                total_allocated_ips=0,
                remaining_ips_selected_network=0,
                selected_network=None,
                network_utilization_pct=0.0,
                recent_activity=[]
            )
            
        # Total subnets and IPs across all sessions
        cursor.execute("""
            SELECT SUM(department_count) as total_subnets,
                   SUM(total_allocated_ips) as total_ips
            FROM allocations
        """)
        sum_row = cursor.fetchone()
        total_subnets = sum_row["total_subnets"] or 0
        total_ips = sum_row["total_ips"] or 0
        
        # Latest session for remaining IPs and utilization
        cursor.execute("""
            SELECT id, title, base_network, department_count, total_allocated_ips,
                   total_base_ips, network_utilization_pct, created_at
            FROM allocations
            ORDER BY id DESC
            LIMIT 1
        """)
        latest = cursor.fetchone()
        remaining_ips = (latest["total_base_ips"] - latest["total_allocated_ips"]) if latest else 0
        selected_network = latest["base_network"] if latest else None
        utilization_pct = latest["network_utilization_pct"] if latest else 0.0
        
        # Recent 5 activities
        cursor.execute("""
            SELECT id, title, base_network, created_at, department_count, network_utilization_pct
            FROM allocations
            ORDER BY id DESC
            LIMIT 5
        """)
        recent_rows = cursor.fetchall()
        recent_activity = [
            RecentActivityItem(
                id=r["id"],
                title=r["title"],
                base_network=r["base_network"],
                created_at=r["created_at"],
                department_count=r["department_count"],
                network_utilization_pct=r["network_utilization_pct"]
            )
            for r in recent_rows
        ]
        
        return DashboardStatsResponse(
            total_saved_sessions=total_sessions,
            total_allocated_subnets=total_subnets,
            total_allocated_ips=total_ips,
            remaining_ips_selected_network=remaining_ips,
            selected_network=selected_network,
            network_utilization_pct=utilization_pct,
            recent_activity=recent_activity
        )


from datetime import date, datetime
from typing import Any

from app.supabase_client import supabase


def _rows(table: str) -> list[dict[str, Any]]:
    try:
        result = supabase.table(table).select("*").execute()
        return result.data or []
    except Exception:
        return []


def _value(row: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if row.get(key) is not None:
            return row[key]
    return default


def documents() -> list[dict[str, Any]]:
    rows = _rows("documents")
    return [
        {
            **row,
            "id": _value(row, "id", "doc_id"),
            "fileName": _value(row, "fileName", "file_name", "filename"),
            "uploadedAt": _value(row, "uploadedAt", "uploaded_at", "upload_time"),
            "type": _value(row, "type", "doc_type"),
        }
        for row in rows
    ]


def staff() -> list[dict[str, Any]]:
    return _rows("staff")


def trainsets() -> list[dict[str, Any]]:
    return _rows("trainsets")


def alerts() -> list[dict[str, Any]]:
    return _rows("alerts")


def audit() -> list[dict[str, Any]]:
    return _rows("audit_trail")


def compliance(staff_rows: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    staff_rows = staff_rows if staff_rows is not None else staff()
    today = date.today()
    expiry_radar: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []

    for person in staff_rows:
        certifications = _value(person, "certifications", default=[])
        for cert in certifications or []:
            expires = cert.get("expiresOn") or cert.get("expires_on")
            if not expires:
                continue
            try:
                expiry = date.fromisoformat(str(expires)[:10])
            except ValueError:
                continue
            days = (expiry - today).days
            item = {"staffId": _value(person, "id", "staff_id"), "staffName": _value(person, "name"), "certification": cert, "daysRemaining": days}
            if days <= 30:
                expiry_radar.append(item)
            if days < 0:
                violations.append({**item, "reason": "Certification expired"})

    return {"expiryRadar": expiry_radar, "violations": violations, "validityGaps": [], "generatedAt": datetime.now().isoformat()}


def snapshot() -> dict[str, Any]:
    docs = documents()
    people = staff()
    fleet = trainsets()
    alert_rows = alerts()
    audit_rows = audit()
    return {
        "documents": docs,
        "staff": people,
        "trainsets": fleet,
        "alerts": alert_rows,
        "audit": audit_rows,
        "compliance": compliance(people),
        "network": {
            "stations": 25,
            "inService": sum(1 for row in fleet if _value(row, "status") == "SERVICE"),
            "underMaintenance": sum(1 for row in fleet if _value(row, "status") in {"IBL", "MAINTENANCE"}),
            "activeAlerts": len(alert_rows),
        },
    }

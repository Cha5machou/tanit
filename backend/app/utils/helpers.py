from datetime import datetime
from typing import Any, Dict


def timestamp_to_datetime(timestamp: Any) -> datetime:
    """Convert Firestore timestamp to datetime"""
    if hasattr(timestamp, 'timestamp'):
        return timestamp.timestamp()
    return timestamp


def datetime_to_dict(dt: datetime) -> Dict[str, Any]:
    """Convert datetime to dict for JSON serialization"""
    return {
        "year": dt.year,
        "month": dt.month,
        "day": dt.day,
        "hour": dt.hour,
        "minute": dt.minute,
        "second": dt.second,
    }


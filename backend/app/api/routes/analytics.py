from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService, get_db
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import uuid

router = APIRouter()


# Analytics Dashboard - Overview Tab
@router.get("/analytics/overview")
async def get_analytics_overview(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get analytics overview metrics
    """
    try:
        db = get_db()
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        # Total Users: Unique registered accounts
        users_ref = db.collection("users")
        users = users_ref.stream()
        total_users = len(list(users))
        
        # Active Sessions: Count of unique session IDs in last 30 days
        page_visits = FirestoreService.get_page_visits(start_time=thirty_days_ago)
        unique_sessions = set()
        for visit in page_visits:
            session_id = visit.get("session_id")
            if session_id:
                unique_sessions.add(session_id)
        active_sessions = len(unique_sessions)
        
        # Total Pageviews: Sum of all page loads
        total_pageviews = len(page_visits)
        
        # Calculate sessions from page visits (group by user and time windows)
        # A session is a group of page visits by the same user within 30 minutes
        user_sessions = defaultdict(list)
        for visit in page_visits:
            user_id = visit.get("user_id")
            start_time = visit.get("start_time")
            if user_id and start_time:
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    except:
                        continue
                elif not isinstance(start_time, datetime):
                    continue
                user_sessions[user_id].append(start_time)
        
        # Group visits into sessions (30 minute inactivity window)
        sessions = []
        for user_id, visit_times in user_sessions.items():
            visit_times.sort()
            current_session_start = None
            for visit_time in visit_times:
                if current_session_start is None:
                    current_session_start = visit_time
                elif (visit_time - current_session_start).total_seconds() > 1800:  # 30 minutes
                    sessions.append({
                        "user_id": user_id,
                        "start": current_session_start,
                        "end": visit_times[visit_times.index(visit_time) - 1] if visit_times.index(visit_time) > 0 else current_session_start,
                    })
                    current_session_start = visit_time
            if current_session_start:
                sessions.append({
                    "user_id": user_id,
                    "start": current_session_start,
                    "end": visit_times[-1] if visit_times else current_session_start,
                })
        
        total_sessions = len(sessions)
        
        # Avg Session Duration: Total time / total sessions
        total_session_duration = sum(
            (s["end"] - s["start"]).total_seconds() 
            for s in sessions 
            if isinstance(s["start"], datetime) and isinstance(s["end"], datetime)
        )
        avg_session_duration = total_session_duration / total_sessions if total_sessions > 0 else 0
        
        # Pages per Session: Total pageviews / total sessions
        pages_per_session = total_pageviews / total_sessions if total_sessions > 0 else 0
        
        # Bounce Rate: Single-page sessions / total sessions
        single_page_sessions = sum(1 for user_id, visit_times in user_sessions.items() if len(visit_times) == 1)
        bounce_rate = single_page_sessions / total_sessions if total_sessions > 0 else 0
        
        return {
            "total_users": total_users,
            "active_sessions": active_sessions,
            "total_pageviews": total_pageviews,
            "avg_session_duration_seconds": round(avg_session_duration, 2),
            "avg_session_duration_minutes": round(avg_session_duration / 60, 2),
            "pages_per_session": round(pages_per_session, 2),
            "bounce_rate": round(bounce_rate * 100, 2),  # Percentage
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting analytics overview: {str(e)}\n{traceback.format_exc()}"
        )


# Analytics Dashboard - Traffic Tab
@router.get("/analytics/traffic")
async def get_traffic_analytics(
    period: str = "day",  # day, week, month
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get traffic analytics (sessions, pageviews, users over time)
    """
    try:
        now = datetime.utcnow()
        if period == "day":
            start_time = now - timedelta(days=30)
            group_format = "%Y-%m-%d"
        elif period == "week":
            start_time = now - timedelta(weeks=12)
            group_format = "%Y-W%W"
        elif period == "month":
            start_time = now - timedelta(days=365)
            group_format = "%Y-%m"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Period must be 'day', 'week', or 'month'"
            )
        
        page_visits = FirestoreService.get_page_visits(start_time=start_time)
        
        # Group by time period
        sessions_by_period = defaultdict(set)
        pageviews_by_period = defaultdict(int)
        users_by_period = defaultdict(set)
        
        for visit in page_visits:
            start_time_visit = visit.get("start_time")
            user_id = visit.get("user_id")
            
            if not start_time_visit:
                continue
            
            if isinstance(start_time_visit, str):
                try:
                    start_time_visit = datetime.fromisoformat(start_time_visit.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(start_time_visit, datetime):
                continue
            
            period_key = start_time_visit.strftime(group_format)
            
            # For sessions, we need to group by user and time windows
            if user_id:
                users_by_period[period_key].add(user_id)
                pageviews_by_period[period_key] += 1
                
                # Create session ID based on user and time window
                session_key = f"{user_id}_{period_key}"
                sessions_by_period[period_key].add(session_key)
        
        # Convert to lists
        sessions_data = [{"period": k, "count": len(v)} for k, v in sorted(sessions_by_period.items())]
        pageviews_data = [{"period": k, "count": v} for k, v in sorted(pageviews_by_period.items())]
        users_data = [{"period": k, "count": len(v)} for k, v in sorted(users_by_period.items())]
        
        # Peak Usage Hours: Heatmap by hour/day
        hour_day_visits = defaultdict(int)
        for visit in page_visits:
            start_time_visit = visit.get("start_time")
            if not start_time_visit:
                continue
            
            if isinstance(start_time_visit, str):
                try:
                    start_time_visit = datetime.fromisoformat(start_time_visit.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(start_time_visit, datetime):
                continue
            
            hour = start_time_visit.hour
            day = start_time_visit.strftime("%A")  # Monday, Tuesday, etc.
            hour_day_visits[f"{day}_{hour}"] += 1
        
        peak_usage = [{"day_hour": k, "count": v} for k, v in sorted(hour_day_visits.items())]
        
        return {
            "period": period,
            "sessions_over_time": sessions_data,
            "pageviews_over_time": pageviews_data,
            "users_over_time": users_data,
            "peak_usage_hours": peak_usage,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting traffic analytics: {str(e)}\n{traceback.format_exc()}"
        )


# Analytics Dashboard - Engagement Tab
@router.get("/analytics/engagement")
async def get_engagement_analytics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get engagement analytics (time per page, page flow, exit pages, entry pages)
    """
    try:
        page_visits = FirestoreService.get_page_visits()
        
        # Time per Page: Average duration on each page
        page_durations = defaultdict(list)
        for visit in page_visits:
            page_path = visit.get("page_path")
            if not page_path:
                continue
            
            # Try to get duration_seconds first
            duration = visit.get("duration_seconds")
            
            # If duration_seconds is not available, calculate from start_time and end_time
            if duration is None or duration == 0:
                start_time = visit.get("start_time")
                end_time = visit.get("end_time")
                
                if start_time and end_time:
                    # Ensure both are datetime objects
                    if isinstance(start_time, str):
                        try:
                            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(start_time, 'timestamp'):
                        start_time = datetime.fromtimestamp(start_time.timestamp())
                    elif not isinstance(start_time, datetime):
                        continue
                    
                    if isinstance(end_time, str):
                        try:
                            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(end_time, 'timestamp'):
                        end_time = datetime.fromtimestamp(end_time.timestamp())
                    elif not isinstance(end_time, datetime):
                        continue
                    
                    # Calculate duration
                    duration = (end_time - start_time).total_seconds()
                    # Only add if duration is positive and reasonable (less than 24 hours)
                    if duration > 0 and duration < 86400:
                        page_durations[page_path].append(duration)
                elif start_time:
                    # If we only have start_time, use current time as end_time (for active sessions)
                    # But only if the start_time is recent (within last hour)
                    if isinstance(start_time, str):
                        try:
                            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(start_time, 'timestamp'):
                        start_time = datetime.fromtimestamp(start_time.timestamp())
                    elif not isinstance(start_time, datetime):
                        continue
                    
                    time_since_start = (datetime.utcnow() - start_time).total_seconds()
                    # Only count if started within last hour
                    if 0 < time_since_start < 3600:
                        page_durations[page_path].append(time_since_start)
            elif duration > 0:
                # duration_seconds exists and is valid
                page_durations[page_path].append(duration)
        
        time_per_page = [
            {
                "page": page,
                "avg_duration_seconds": sum(durations) / len(durations) if durations else 0,
                "total_visits": len(durations),
            }
            for page, durations in page_durations.items()
        ]
        time_per_page.sort(key=lambda x: x["avg_duration_seconds"], reverse=True)
        
        # Page Flow: Navigation paths (from previous_page to page_path)
        page_flows = defaultdict(int)
        for visit in page_visits:
            page_path = visit.get("page_path")
            previous_page = visit.get("previous_page")
            if page_path and previous_page:
                flow_key = f"{previous_page} -> {page_path}"
                page_flows[flow_key] += 1
        
        page_flow_data = [{"flow": k, "count": v} for k, v in sorted(page_flows.items(), key=lambda x: x[1], reverse=True)[:20]]
        
        # Exit Pages: Where users leave most (pages with no next page visit within session)
        # Entry Pages: Where users arrive first
        user_visits = defaultdict(list)
        for visit in page_visits:
            user_id = visit.get("user_id")
            page_path = visit.get("page_path")
            start_time = visit.get("start_time")
            previous_page = visit.get("previous_page")
            
            if user_id and page_path and start_time:
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    except:
                        continue
                elif not isinstance(start_time, datetime):
                    continue
                
                user_visits[user_id].append({
                    "page": page_path,
                    "previous": previous_page,
                    "time": start_time,
                })
        
        exit_pages = defaultdict(int)
        entry_pages = defaultdict(int)
        
        for user_id, visits in user_visits.items():
            visits.sort(key=lambda x: x["time"])
            
            # First page is entry
            if visits:
                entry_pages[visits[0]["page"]] += 1
            
            # Last page is exit (if no visit within 30 minutes)
            if visits:
                last_visit = visits[-1]
                exit_pages[last_visit["page"]] += 1
        
        exit_pages_data = [{"page": k, "count": v} for k, v in sorted(exit_pages.items(), key=lambda x: x[1], reverse=True)[:10]]
        entry_pages_data = [{"page": k, "count": v} for k, v in sorted(entry_pages.items(), key=lambda x: x[1], reverse=True)[:10]]
        
        return {
            "time_per_page": time_per_page,
            "page_flow": page_flow_data,
            "exit_pages": exit_pages_data,
            "entry_pages": entry_pages_data,
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting engagement analytics: {str(e)}\n{traceback.format_exc()}"
        )


# Analytics Dashboard - Acquisition Tab
@router.get("/analytics/acquisition")
async def get_acquisition_analytics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get acquisition analytics (channels, devices, browsers, OS)
    """
    try:
        page_visits = FirestoreService.get_page_visits()
        
        # Debug: Check if we have visits and what fields they contain
        import logging
        if page_visits:
            sample_keys = list(page_visits[0].keys()) if page_visits else []
            logging.info(f"Total page visits: {len(page_visits)}, Sample visit keys: {sample_keys}")
            if page_visits:
                logging.info(f"Sample visit data: device_type={page_visits[0].get('device_type')}, referrer={page_visits[0].get('referrer')}, previous_page={page_visits[0].get('previous_page')}")
        
        # Channels: Parse from referrer or UTM params
        channels = defaultdict(int)
        devices = defaultdict(int)
        browsers = defaultdict(int)
        operating_systems = defaultdict(int)
        
        for visit in page_visits:
            # Try multiple ways to get referrer
            referrer = visit.get("referrer") or visit.get("previous_page") or visit.get("referer") or None
            device_type = visit.get("device_type")
            if not device_type or device_type == "null" or device_type == "None":
                device_type = "unknown"
            user_agent = visit.get("user_agent") or ""
            
            # Channel detection
            if not referrer or referrer == "unknown" or referrer == "null" or (isinstance(referrer, str) and referrer.startswith("/")):
                channels["direct"] += 1
            elif isinstance(referrer, str) and "google" in referrer.lower():
                channels["organic_search"] += 1
            elif isinstance(referrer, str) and any(social in referrer.lower() for social in ["facebook", "twitter", "instagram", "linkedin"]):
                channels["social"] += 1
            elif referrer and referrer != "unknown" and referrer != "null":
                channels["referral"] += 1
            else:
                channels["direct"] += 1
            
            # Device type - always count, even if unknown
            devices[device_type] = devices.get(device_type, 0) + 1
            
            # Browser and OS from user_agent
            ua_lower = user_agent.lower()
            if "chrome" in ua_lower and "edg" not in ua_lower:
                browsers["Chrome"] += 1
            elif "firefox" in ua_lower:
                browsers["Firefox"] += 1
            elif "safari" in ua_lower and "chrome" not in ua_lower:
                browsers["Safari"] += 1
            elif "edg" in ua_lower:
                browsers["Edge"] += 1
            else:
                browsers["Other"] += 1
            
            if "windows" in ua_lower:
                operating_systems["Windows"] += 1
            elif "mac" in ua_lower or "darwin" in ua_lower:
                operating_systems["macOS"] += 1
            elif "linux" in ua_lower:
                operating_systems["Linux"] += 1
            elif "android" in ua_lower:
                operating_systems["Android"] += 1
            elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
                operating_systems["iOS"] += 1
            else:
                operating_systems["Other"] += 1
        
        # Ensure we have at least some data even if empty
        if not channels:
            channels["direct"] = 0
        if not devices:
            devices["unknown"] = 0
        if not browsers:
            browsers["Other"] = 0
        if not operating_systems:
            operating_systems["Other"] = 0
        
        return {
            "channels": [{"channel": k, "count": v} for k, v in sorted(channels.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "devices": [{"device": k, "count": v} for k, v in sorted(devices.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "browsers": [{"browser": k, "count": v} for k, v in sorted(browsers.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "operating_systems": [{"os": k, "count": v} for k, v in sorted(operating_systems.items(), key=lambda x: x[1], reverse=True) if v > 0],
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting acquisition analytics: {str(e)}\n{traceback.format_exc()}"
        )


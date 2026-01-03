from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService, get_db
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import uuid
import logging

logger = logging.getLogger(__name__)

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
        
        # Country distribution: Get nationality (ISO2 code) from profiles
        profiles_ref = db.collection("profiles")
        profiles = profiles_ref.stream()
        country_counts = defaultdict(int)
        
        profile_count = 0
        for profile_doc in profiles:
            profile_count += 1
            profile_data = profile_doc.to_dict()
            nationalite = profile_data.get("nationalite")
            if nationalite:
                # nationalite should already be ISO2 code (e.g., "FR", "US", "GB", "TN")
                # Convert to uppercase to ensure consistency
                iso2_code = nationalite.upper().strip()
                if len(iso2_code) == 2:  # Valid ISO2 code
                    country_counts[iso2_code] += 1
                    logger.debug(f"Found nationality: {iso2_code} for profile {profile_doc.id}")
        
        logger.info(f"Processed {profile_count} profiles, found {len(country_counts)} countries: {dict(country_counts)}")
        
        # Create country distribution data (using ISO2 codes)
        country_distribution = [
            {"country": country_code, "count": count}
            for country_code, count in sorted(country_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        logger.info(f"Country distribution: {country_distribution}")
        
        return {
            "total_users": total_users,
            "active_sessions": active_sessions,
            "total_pageviews": total_pageviews,
            "avg_session_duration_seconds": round(avg_session_duration, 2),
            "avg_session_duration_minutes": round(avg_session_duration / 60, 2),
            "pages_per_session": round(pages_per_session, 2),
            "bounce_rate": round(bounce_rate * 100, 2),  # Percentage
            "country_distribution": country_distribution,
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
        # Group by session_id to find first and last page per session
        session_visits = defaultdict(list)
        for visit in page_visits:
            session_id = visit.get("session_id")
            page_path = visit.get("page_path")
            start_time = visit.get("start_time")
            previous_page = visit.get("previous_page")
            
            # Require session_id to group by session
            if session_id and page_path and start_time:
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    except:
                        continue
                elif not isinstance(start_time, datetime):
                    continue
                
                session_visits[session_id].append({
                    "page": page_path,
                    "previous": previous_page,
                    "time": start_time,
                })
        
        exit_pages = defaultdict(int)
        entry_pages = defaultdict(int)
        
        # For each session, find the first page (entry) and last page (exit)
        for session_id, visits in session_visits.items():
            if not visits:
                continue
                
            # Sort visits by time within the session
            visits.sort(key=lambda x: x["time"])
            
            # First page in session is entry page
            entry_pages[visits[0]["page"]] += 1
            
            # Last page in session is exit page
            exit_pages[visits[-1]["page"]] += 1
        
        exit_pages_data = [{"page": k, "count": v} for k, v in sorted(exit_pages.items(), key=lambda x: x[1], reverse=True)[:10]]
        entry_pages_data = [{"page": k, "count": v} for k, v in sorted(entry_pages.items(), key=lambda x: x[1], reverse=True)[:10]]
        
        # Sankey data: Two distinct levels
        # Level 1 (sources): previous_page
        # Level 2 (targets): page_path
        # Even if same name appears in both levels, they are separate nodes
        sankey_links = defaultdict(int)
        source_pages = set()
        target_pages = set()
        
        for visit in page_visits:
            page_path = visit.get("page_path")
            previous_page = visit.get("previous_page")
            
            # Only process if both page_path and previous_page exist
            if page_path and previous_page:
                source = previous_page if previous_page else "unknown"
                target = page_path if page_path else "unknown"
                
                # Skip if source and target are the same (no self-loops)
                if source != target:
                    sankey_links[(source, target)] += 1
                    source_pages.add(source)
                    target_pages.add(target)
        
        # Create two separate node lists: sources and targets
        # Sources (previous_page) - Level 1
        source_nodes_list = sorted(source_pages)
        source_to_index = {page: idx for idx, page in enumerate(source_nodes_list)}
        
        # Targets (page_path) - Level 2
        target_nodes_list = sorted(target_pages)
        target_to_index = {page: idx + len(source_nodes_list) for idx, page in enumerate(target_nodes_list)}
        
        # Combine nodes: sources first, then targets
        sankey_nodes = (
            [{"name": page, "level": 1} for page in source_nodes_list] +
            [{"name": page, "level": 2} for page in target_nodes_list]
        )
        
        # Create links (transitions from previous_page to page_path)
        sankey_links_data = [
            {
                "source": source_to_index[source],
                "target": target_to_index[target],
                "value": count,
            }
            for (source, target), count in sankey_links.items()
        ]
        
        # Funnel data: Group by session_id, sort by start_time
        # Count: login, formulaire (onboarding), home, then AI or Map
        session_visits = defaultdict(list)
        for visit in page_visits:
            session_id = visit.get("session_id")
            page_path = visit.get("page_path", "")
            start_time = visit.get("start_time")
            
            if session_id and page_path and start_time:
                # Convert start_time to datetime for sorting
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    except:
                        continue
                elif hasattr(start_time, 'timestamp'):
                    start_time = datetime.fromtimestamp(start_time.timestamp())
                elif not isinstance(start_time, datetime):
                    continue
                
                # Normalize page paths
                normalized_page = None
                if page_path == "/login":
                    normalized_page = "login"
                elif page_path == "/onboarding":
                    normalized_page = "formulaire"
                elif page_path == "/home" or page_path == "/":
                    normalized_page = "home"
                elif page_path.startswith("/ai"):
                    normalized_page = "ai"
                elif page_path.startswith("/map"):
                    normalized_page = "map"
                
                if normalized_page:
                    session_visits[session_id].append({
                        "page": normalized_page,
                        "time": start_time,
                    })
        
        # Sort visits within each session by start_time
        for session_id in session_visits:
            session_visits[session_id].sort(key=lambda x: x["time"])
        
        # Page visits count: Simple count of page_path visits (for horizontal bar chart)
        page_path_counts = defaultdict(int)
        
        for visit in page_visits:
            page_path = visit.get("page_path")
            if page_path:
                page_path_counts[page_path] += 1
        
        # Create page visits data: simple count of each page_path
        page_visits_data = []
        sorted_pages = sorted(page_path_counts.items(), key=lambda x: x[1], reverse=True)
        
        for page_path, count in sorted_pages:
            page_visits_data.append({
                "page": page_path,
                "count": count
            })
        
        return {
            "time_per_page": time_per_page,
            "page_flow": page_flow_data,
            "exit_pages": exit_pages_data,
            "entry_pages": entry_pages_data,
            "sankey": {
                "nodes": sankey_nodes,
                "links": sankey_links_data,
            },
            "page_visits_count": page_visits_data,
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
        # Use sets to count unique channels/devices/browsers/OS per session_id
        channels = defaultdict(set)  # Track unique channels per session_id
        devices = defaultdict(set)  # Track unique devices per session_id
        browsers = defaultdict(set)  # Track unique browsers per session_id
        operating_systems = defaultdict(set)  # Track unique OS per session_id
        
        # Track unique channels/devices/browsers/OS per session_id
        session_channels = defaultdict(set)
        session_devices = defaultdict(set)
        session_browsers = defaultdict(set)
        session_os = defaultdict(set)
        
        for visit in page_visits:
            # Skip non-login pages for channel counting (only count login page)
            page_path = visit.get("page_path", "")
            if page_path != "/login" and page_path != "/":
                # Still process for devices/browsers/OS, but skip channel counting
                session_id = visit.get("session_id")
                device_type = visit.get("device_type")
                user_agent = visit.get("user_agent") or ""
                
                # Ensure device_type is a string
                if device_type is None or device_type == "null" or device_type == "None" or device_type == "":
                    device_type = "unknown"
                elif not isinstance(device_type, str):
                    device_type = str(device_type)
                
                # Track unique device per session
                if session_id and device_type:
                    session_devices[session_id].add(device_type)
                
                # Track unique browser per session
                ua_lower = user_agent.lower()
                browser = "Other"
                if "chrome" in ua_lower and "edg" not in ua_lower:
                    browser = "Chrome"
                elif "firefox" in ua_lower:
                    browser = "Firefox"
                elif "safari" in ua_lower and "chrome" not in ua_lower:
                    browser = "Safari"
                elif "edg" in ua_lower:
                    browser = "Edge"
                
                if session_id:
                    session_browsers[session_id].add(browser)
                
                # Track unique OS per session
                os_name = "Other"
                if "windows" in ua_lower:
                    os_name = "Windows"
                elif "mac" in ua_lower or "darwin" in ua_lower:
                    os_name = "macOS"
                elif "linux" in ua_lower:
                    os_name = "Linux"
                elif "android" in ua_lower:
                    os_name = "Android"
                elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
                    os_name = "iOS"
                
                if session_id:
                    session_os[session_id].add(os_name)
                
                continue
            
            # Only process login page (or root "/") for channel counting
            # Try multiple ways to get referrer
            referrer = visit.get("referrer") or visit.get("previous_page") or visit.get("referer") or None
            
            # Treat localhost:3000 as direct
            if isinstance(referrer, str) and ("localhost:3000" in referrer or "127.0.0.1:3000" in referrer):
                referrer = None
            
            device_type = visit.get("device_type")
            
            # Ensure device_type is a string
            if device_type is None or device_type == "null" or device_type == "None" or device_type == "":
                device_type = "unknown"
            elif not isinstance(device_type, str):
                device_type = str(device_type)
            
            user_agent = visit.get("user_agent") or ""
            session_id = visit.get("session_id")
            
            # Channel detection - prioritize UTM parameters and custom channel
            acquisition_channel = visit.get("acquisition_channel")
            utm_source = visit.get("utm_source")
            utm_medium = visit.get("utm_medium")
            
            # Determine channel name
            channel_name = None
            if acquisition_channel:
                channel_name = str(acquisition_channel) if not isinstance(acquisition_channel, str) else acquisition_channel
            elif utm_source and utm_medium:
                # Build channel from UTM parameters
                utm_source_str = str(utm_source) if not isinstance(utm_source, str) else utm_source
                utm_medium_str = str(utm_medium) if not isinstance(utm_medium, str) else utm_medium
                channel_name = f"{utm_source_str}_{utm_medium_str}"
            elif utm_source:
                # Use utm_source as channel
                channel_name = str(utm_source) if not isinstance(utm_source, str) else utm_source
            elif not referrer or referrer == "unknown" or referrer == "null" or (isinstance(referrer, str) and referrer.startswith("/")):
                channel_name = "direct"
            elif isinstance(referrer, str) and "google" in referrer.lower():
                channel_name = "organic_search"
            elif isinstance(referrer, str) and any(social in referrer.lower() for social in ["facebook", "twitter", "instagram", "linkedin"]):
                channel_name = "social"
            elif referrer and referrer != "unknown" and referrer != "null":
                channel_name = "referral"
            else:
                channel_name = "direct"
            
            # Track unique channel per session
            if session_id and channel_name:
                session_channels[session_id].add(channel_name)
            
            # Track unique device per session
            if session_id and device_type:
                session_devices[session_id].add(device_type)
            
            # Track unique browser per session
            ua_lower = user_agent.lower()
            browser = "Other"
            if "chrome" in ua_lower and "edg" not in ua_lower:
                browser = "Chrome"
            elif "firefox" in ua_lower:
                browser = "Firefox"
            elif "safari" in ua_lower and "chrome" not in ua_lower:
                browser = "Safari"
            elif "edg" in ua_lower:
                browser = "Edge"
            
            if session_id:
                session_browsers[session_id].add(browser)
            
            # Track unique OS per session
            os_name = "Other"
            if "windows" in ua_lower:
                os_name = "Windows"
            elif "mac" in ua_lower or "darwin" in ua_lower:
                os_name = "macOS"
            elif "linux" in ua_lower:
                os_name = "Linux"
            elif "android" in ua_lower:
                os_name = "Android"
            elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
                os_name = "iOS"
            
            if session_id:
                session_os[session_id].add(os_name)
        
        # Count unique channels per session
        for session_id, channel_set in session_channels.items():
            for channel in channel_set:
                channels[channel].add(session_id)
        
        # Count unique devices per session
        for session_id, device_set in session_devices.items():
            for device in device_set:
                devices[device].add(session_id)
        
        # Count unique browsers per session
        for session_id, browser_set in session_browsers.items():
            for browser in browser_set:
                browsers[browser].add(session_id)
        
        # Count unique OS per session
        for session_id, os_set in session_os.items():
            for os_name in os_set:
                operating_systems[os_name].add(session_id)
        
        # Convert sets to counts
        channels_count = {k: len(v) for k, v in channels.items()}
        devices_count = {k: len(v) for k, v in devices.items()}
        browsers_count = {k: len(v) for k, v in browsers.items()}
        operating_systems_count = {k: len(v) for k, v in operating_systems.items()}
        
        # Ensure we have at least some data even if empty
        if not channels_count:
            channels_count["direct"] = 0
        if not devices_count:
            devices_count["unknown"] = 0
        if not browsers_count:
            browsers_count["Other"] = 0
        if not operating_systems_count:
            operating_systems_count["Other"] = 0
        
        return {
            "channels": [{"channel": k, "count": v} for k, v in sorted(channels_count.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "devices": [{"device": k, "count": v} for k, v in sorted(devices_count.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "browsers": [{"browser": k, "count": v} for k, v in sorted(browsers_count.items(), key=lambda x: x[1], reverse=True) if v > 0],
            "operating_systems": [{"os": k, "count": v} for k, v in sorted(operating_systems_count.items(), key=lambda x: x[1], reverse=True) if v > 0],
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting acquisition analytics: {str(e)}\n{traceback.format_exc()}"
        )


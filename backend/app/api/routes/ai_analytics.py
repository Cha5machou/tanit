from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService, get_db
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter()


# AI Usage Dashboard - Conversations Tab
@router.get("/ai-analytics/conversations")
async def get_ai_conversations_analytics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get AI conversations analytics
    """
    try:
        db = get_db()
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        conversations_ref = db.collection("conversations")
        conversations = conversations_ref.stream()
        
        total_conversations = 0
        conversations_by_user = defaultdict(int)
        messages_by_conversation = []
        active_conversations_7d = set()
        active_conversations_30d = set()
        
        for conv in conversations:
            total_conversations += 1
            data = conv.to_dict()
            user_id = data.get("user_id")
            messages = data.get("messages", [])
            created_at = data.get("created_at")
            updated_at = data.get("updated_at")
            
            if user_id:
                conversations_by_user[user_id] += 1
            
            messages_by_conversation.append(len(messages))
            
            # Check if conversation is active (updated in last 7/30 days)
            check_time = updated_at or created_at
            if check_time:
                if hasattr(check_time, 'timestamp'):
                    conv_time = datetime.fromtimestamp(check_time.timestamp())
                elif isinstance(check_time, datetime):
                    conv_time = check_time
                else:
                    conv_time = None
                
                if conv_time:
                    if conv_time >= seven_days_ago:
                        active_conversations_7d.add(conv.id)
                    if conv_time >= thirty_days_ago:
                        active_conversations_30d.add(conv.id)
        
        # Calculate statistics
        total_users_with_conversations = len(conversations_by_user)
        avg_conversations_per_user = total_conversations / total_users_with_conversations if total_users_with_conversations > 0 else 0
        
        # Median conversations per user
        conv_counts = sorted(conversations_by_user.values())
        median_conversations_per_user = conv_counts[len(conv_counts) // 2] if conv_counts else 0
        
        # Messages per conversation stats
        avg_messages_per_conversation = sum(messages_by_conversation) / len(messages_by_conversation) if messages_by_conversation else 0
        median_messages_per_conversation = sorted(messages_by_conversation)[len(messages_by_conversation) // 2] if messages_by_conversation else 0
        
        return {
            "total_conversations": total_conversations,
            "avg_conversations_per_user": round(avg_conversations_per_user, 2),
            "median_conversations_per_user": median_conversations_per_user,
            "conversations_distribution": {
                "min": min(conversations_by_user.values()) if conversations_by_user else 0,
                "max": max(conversations_by_user.values()) if conversations_by_user else 0,
                "p25": conv_counts[len(conv_counts) // 4] if conv_counts else 0,
                "p75": conv_counts[3 * len(conv_counts) // 4] if conv_counts else 0,
            },
            "avg_messages_per_conversation": round(avg_messages_per_conversation, 2),
            "median_messages_per_conversation": median_messages_per_conversation,
            "active_conversations_7d": len(active_conversations_7d),
            "active_conversations_30d": len(active_conversations_30d),
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting AI conversations analytics: {str(e)}\n{traceback.format_exc()}"
        )


# AI Usage Dashboard - Performance Tab
@router.get("/ai-analytics/performance")
async def get_ai_performance_analytics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get AI performance analytics (tokens, cost, latency by model)
    """
    try:
        # Get AI events
        ai_requests = FirestoreService.get_ai_events(event_type="ai_request")
        embedding_requests = FirestoreService.get_ai_events(event_type="embedding_request")
        
        # Group by model/provider
        model_stats = defaultdict(lambda: {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_cost": 0.0,
            "latencies": [],
            "request_count": 0,
        })
        
        embedding_stats = defaultdict(lambda: {
            "input_tokens": 0,
            "total_cost": 0.0,
            "latencies": [],
            "request_count": 0,
        })
        
        # Process AI requests
        for event in ai_requests:
            model = event.get("model", "unknown")
            provider = event.get("provider", "unknown")
            model_key = f"{provider}:{model}"
            
            input_tokens = event.get("input_tokens", 0)
            output_tokens = event.get("output_tokens", 0)
            cost = event.get("cost_usd", 0.0)
            latency = event.get("latency_ms", 0)
            
            model_stats[model_key]["input_tokens"] += input_tokens
            model_stats[model_key]["output_tokens"] += output_tokens
            model_stats[model_key]["total_cost"] += cost
            model_stats[model_key]["latencies"].append(latency)
            model_stats[model_key]["request_count"] += 1
        
        # Process embedding requests
        for event in embedding_requests:
            model = event.get("model", "unknown")
            provider = event.get("provider", "unknown")
            model_key = f"{provider}:{model}"
            
            input_tokens = event.get("input_tokens", 0)
            cost = event.get("cost_usd", 0.0)
            latency = event.get("latency_ms", 0)
            
            embedding_stats[model_key]["input_tokens"] += input_tokens
            embedding_stats[model_key]["total_cost"] += cost
            embedding_stats[model_key]["latencies"].append(latency)
            embedding_stats[model_key]["request_count"] += 1
        
        # Calculate averages
        model_performance = []
        for model_key, stats in model_stats.items():
            avg_latency = sum(stats["latencies"]) / len(stats["latencies"]) if stats["latencies"] else 0
            model_performance.append({
                "model": model_key,
                "input_tokens": stats["input_tokens"],
                "output_tokens": stats["output_tokens"],
                "total_cost_usd": round(stats["total_cost"], 4),
                "avg_latency_ms": round(avg_latency, 2),
                "request_count": stats["request_count"],
            })
        
        embedding_performance = []
        for model_key, stats in embedding_stats.items():
            avg_latency = sum(stats["latencies"]) / len(stats["latencies"]) if stats["latencies"] else 0
            embedding_performance.append({
                "model": model_key,
                "input_tokens": stats["input_tokens"],
                "total_cost_usd": round(stats["total_cost"], 4),
                "avg_latency_ms": round(avg_latency, 2),
                "request_count": stats["request_count"],
            })
        
        # Token usage over time
        token_usage_by_date = defaultdict(lambda: {"input": 0, "output": 0})
        for event in ai_requests:
            created_at = event.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        continue
                elif not isinstance(created_at, datetime):
                    continue
                
                date_key = created_at.strftime("%Y-%m-%d")
                token_usage_by_date[date_key]["input"] += event.get("input_tokens", 0)
                token_usage_by_date[date_key]["output"] += event.get("output_tokens", 0)
        
        token_usage_over_time = [
            {"date": k, "input_tokens": v["input"], "output_tokens": v["output"]}
            for k, v in sorted(token_usage_by_date.items())
        ]
        
        # Cost over time
        cost_by_date = defaultdict(float)
        for event in ai_requests + embedding_requests:
            created_at = event.get("created_at")
            cost = event.get("cost_usd", 0.0)
            if created_at:
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        continue
                elif not isinstance(created_at, datetime):
                    continue
                
                date_key = created_at.strftime("%Y-%m-%d")
                cost_by_date[date_key] += cost
        
        cost_over_time = [
            {"date": k, "cost_usd": round(v, 4)}
            for k, v in sorted(cost_by_date.items())
        ]
        
        # Latency distribution
        all_latencies = []
        for event in ai_requests:
            latency = event.get("latency_ms", 0)
            if latency > 0:
                all_latencies.append(latency)
        
        latency_distribution = {
            "min": min(all_latencies) if all_latencies else 0,
            "max": max(all_latencies) if all_latencies else 0,
            "avg": sum(all_latencies) / len(all_latencies) if all_latencies else 0,
            "p50": sorted(all_latencies)[len(all_latencies) // 2] if all_latencies else 0,
            "p95": sorted(all_latencies)[int(len(all_latencies) * 0.95)] if all_latencies else 0,
            "p99": sorted(all_latencies)[int(len(all_latencies) * 0.99)] if all_latencies else 0,
        }
        
        return {
            "model_performance": model_performance,
            "embedding_performance": embedding_performance,
            "token_usage_over_time": token_usage_over_time,
            "cost_over_time": cost_over_time,
            "latency_distribution": latency_distribution,
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting AI performance analytics: {str(e)}\n{traceback.format_exc()}"
        )


# AI Usage Dashboard - Traces Tab
@router.get("/ai-analytics/traces")
async def get_ai_traces_analytics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get AI traces analytics (total traces, error rate, trace types)
    """
    try:
        # Get all AI events as traces
        all_ai_events = FirestoreService.get_ai_events()
        
        total_traces = len(all_ai_events)
        
        # Count by event type
        trace_types = defaultdict(int)
        error_count = 0
        
        for event in all_ai_events:
            event_type = event.get("event_type", "unknown")
            trace_types[event_type] += 1
            
            # Check for errors (if error field exists)
            if event.get("error") or event.get("status") == "error":
                error_count += 1
        
        error_rate = error_count / total_traces if total_traces > 0 else 0
        
        return {
            "total_traces": total_traces,
            "error_rate": round(error_rate * 100, 2),  # Percentage
            "error_count": error_count,
            "trace_types": [{"type": k, "count": v} for k, v in sorted(trace_types.items(), key=lambda x: x[1], reverse=True)],
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting AI traces analytics: {str(e)}\n{traceback.format_exc()}"
        )


# AI Costs Calculation

This document describes the cost calculation methods used for embeddings and LLMs in the AI agent.

## Embedding Costs

Embedding costs are calculated in `backend/app/services/ai_agent.py` in the `_get_embeddings` method.

### OpenAI Embeddings
- **Cost per 1M tokens**: $0.02 USD
- **Cost per 1K tokens**: $0.00002 USD
- **Model**: `text-embedding-3-small` (default) or custom model
- **Calculation**: `cost_usd = (estimated_tokens * 0.00002 / 1000)`

### Google (Gemini) Embeddings
- **Cost per 1M tokens**: $0.15 USD
- **Cost per 1K tokens**: $0.00015 USD
- **Model**: `text-embedding-3-small` (default) or custom model
- **Calculation**: `cost_usd = (estimated_tokens * 0.00015 / 1000)`

### Code Reference
```python
# Calculate cost (approximate)
# OpenAI text-embedding-3-small: $0.02 per 1M tokens = $0.00002 per 1K tokens
# Google text-embedding-3-small: $0.15 per 1M tokens = $0.00015 per 1K tokens
cost_per_1k = 0.00002 if embedding_provider == "openai" else 0.00015
cost_usd = (estimated_tokens * cost_per_1k / 1000)
```

## LLM Costs

LLM costs are calculated in `backend/app/api/routes/ai.py` in the `query` endpoint.

### OpenAI GPT-4o-mini
- **Input tokens**: $0.15 per 1M tokens = $0.00015 per 1K tokens
- **Output tokens**: $0.60 per 1M tokens = $0.0006 per 1K tokens
- **Model**: `gpt-4o-mini` (default)
- **Calculation**: 
  ```python
  cost_usd = (input_tokens * 0.00015 / 1000) + (output_tokens * 0.0006 / 1000)
  ```

### Google Gemini 2.0 Flash
- **Input tokens**: $0.3 per 1M tokens = $0.0003 per 1K tokens
- **Output tokens**: $2.50 per 1M tokens = $0.0025 per 1K tokens
- **Model**: `gemini-2.0-flash-exp` (default)
- **Calculation**:
  ```python
  cost_usd = (input_tokens * 0.0003 / 1000) + (output_tokens * 0.0025 / 1000)
  ```

### Code Reference
```python
# Calculate cost (approximate - adjust based on actual model pricing)
# OpenAI GPT-4o-mini: $0.15/$0.60 per 1M tokens = $0.00015/$0.0006 per 1K tokens
# Gemini 2.0 Flash: $0.3/$2.50 per 1M tokens = $0.0003/$0.0025 per 1K tokens
cost_per_1k_input = 0.00015 if llm_provider == "openai" else 0.0003
cost_per_1k_output = 0.0006 if llm_provider == "openai" else 0.0025
cost_usd = (input_tokens * cost_per_1k_input / 1000) + (output_tokens * cost_per_1k_output / 1000)
```

## Notes

- Token counts are approximate estimates based on text length
- Actual costs may vary slightly based on the exact tokenization used by each provider
- Costs are logged in the `ai_events` collection in Firestore with the `cost_usd` field
- These costs are used in the AI Usage Dashboard for performance analytics


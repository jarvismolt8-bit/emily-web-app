# 064 - Explore Free Models from HuggingFace

**Updated:** Mar 04 2026

## Problem

Explore the possibility of using HuggingFace free models via API in OpenCode.

## Research Findings

### HuggingFace Inference API

| Aspect | Details |
|--------|---------|
| **API Endpoint** | `https://api-inference.huggingface.co/models/{model}` |
| **Authentication** | Bearer token (API key from HuggingFace) |
| **Free Tier** | 300 requests/hour (registered users), $0.10 credits/month |
| **PRO** | $2.00/month, 1000 requests/hour |
| **Model Format** | `{org}/{model-name}` e.g., `meta-llama/Llama-3.2-3B-Instruct` |

### OpenCode HuggingFace Integration

OpenCode natively supports HuggingFace Inference Providers. However, testing revealed that:

- **HuggingFace is NOT free** - Even on the free tier, models may have usage costs
- **Rate limits apply** - Only 300 requests/hour on free tier
- **Not all models are free** - Some models may use credits

### Models Available (when configured)

These models are available through HuggingFace Inference Providers:

| Model | Free Status | Notes |
|-------|-------------|-------|
| DeepSeek-R1-0528 | ⚠️ May cost | Reasoning model |
| DeepSeek-V3.2 | ⚠️ May cost | General purpose |
| GLM-4.7 | ⚠️ May cost | ZAI model |
| GLM-4.7-Flash | ⚠️ May cost | Fast version |
| Kimi-K2 series | ❌ Cost | Moonshot AI |
| MiniMax-M2 series | ❌ Cost | MiniMax |
| Qwen3 series | ⚠️ May cost | Generally available |
| GPT-OSS 120B | ⚠️ May cost | Open source |

## Conclusion

**HuggingFace integration is NOT recommended for free use** because:
1. Not all models are free - many use HuggingFace credits
2. Free tier has low rate limits (300 req/hour)
3. Costs can accumulate quickly with larger models

## Alternative: OpenRouter (Recommended)

For free AI models, use **OpenRouter** instead:

- Many free models available
- Better rate limits
- More predictable pricing

OpenRouter is already configured in OpenCode with these free models:
- `openrouter/meta-llama/llama-3.2-3b-instruct:free`
- `openrouter/qwen/qwen3-4b:free`
- `openrouter/google/gemma-3-4b-it:free`

## Status

**Closed - Not Implemented**

HuggingFace was tested but found to not be suitable for free use. OpenRouter provides better free alternatives.

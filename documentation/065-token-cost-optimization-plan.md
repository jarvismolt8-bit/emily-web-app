# 065-token-cost-optimization-plan

## Overview
This document outlines the comprehensive plan for reducing token costs in OpenCode by addressing context bloat, inefficient model usage, and memory management.

## Current Cost Inefficiencies

### 1. Memory File Bloat (15-25% token waste)
- **Issue**: 21 memory files from February 2026 (some 30KB+)
- **Files affected**: `2026-02-*.md` files in `.openclaw/workspace/memory/`
- **Impact**: Old context unnecessarily loaded every session
- **Cost impact**: High - consumes 15-25% of tokens on outdated information

### 2. Large Skill Documentation (20-30% token waste)
- **Issue**: Skills with 200-300+ lines loaded every invocation
- **Examples**:
  - `task-skill`: 343 lines (SKILL.md)
  - `cashflow-skill`: 257 lines (SKILL.md)
- **Impact**: Massive context overhead for simple operations
- **Cost impact**: Medium-High - 20-30% token waste

### 3. Inefficient Model Selection (40-60% potential savings)
- **Issue**: Using expensive models when free alternatives available
- **Current expensive models**:
  - `deepseek-ai/DeepSeek-R1` ($3 input token)
  - `openrouter/anthropic/claude-opus-4.6` (high cost)
- **Free alternatives available**:
  - `minimax-m2.5-free` (recommended primary)
  - `kimi-k2.5-free` (fallback)
  - `trinity-large-preview-free` (complex tasks)
- **Cost impact**: Very High - 10-50x cost difference for same functionality

### 4. Suboptimal Context Management (10-15% token waste)
- **Issue**: "Safeguard" compaction mode may be too conservative
- **Current config**: `"compaction": {"mode": "safeguard"}`
- **Impact**: Context window not optimally utilized
- **Cost impact**: Medium - 10-15% token waste

### 5. Memory File Corruption (5-10% token waste)
- **Issue**: Some files contain repeated/broken content
- **Files affected**: `2026-02-02-0511.md`, `2026-02-02-1532.md`
- **Impact**: Wasted tokens on corrupted data
- **Cost impact**: Low-Medium - 5-10% token waste

## Optimization Plan

### Phase 1: Memory Management (Immediate Impact)
**Goal**: 15-25% token cost reduction
**Timeline**: 30 minutes

#### Tasks:
1. **Clean up old memory files**
   - Delete memory files older than 7 days
   - Keep only: `2026-02-28-*.md` and current day
   - Archive files to `memory/archive/` instead of deleting

2. **Implement size limits**
   - Set maximum file size: 5KB per memory file
   - Truncate files exceeding limit, keeping only recent content
   - Add warning if file needs truncation

3. **Add memory compression**
   - Create `memory-compressor` skill for large files
   - Compress files >3KB using GZIP
   - Decompress only when needed

4. **Fix corrupted memory files**
   - Identify and repair files with repeated content
   - Remove duplicate entries and broken formatting

### Phase 2: Skill Documentation Optimization
**Goal**: 20-30% token cost reduction
**Timeline**: 1 hour

#### Tasks:
1. **Create condensed skill versions**
   - Extract essential operations only (50-100 lines vs 300+)
   - Create `SKILL-ESSENTIAL.md` files
   - Maintain full versions for reference

2. **Implement lazy loading**
   - Load only relevant skill sections based on user commands
   - Create modular skill documentation
   - Add context-aware skill loading

3. **Add skill caching**
   - Cache skill documentation in memory
   - Avoid reloading same documentation repeatedly
   - Implement cache invalidation when skills update

4. **Modular documentation**
   - Split large skills into focused modules
   - Load only what's needed for specific task types
   - Create quick-reference guides

### Phase 3: Intelligent Model Selection
**Goal**: 40-60% token cost reduction
**Timeline**: 30 minutes

#### Tasks:
1. **Prioritize free models**
   - Update `openclaw.json` to use free models as primary:
     - `opencode/minimax-m2.5-free` (primary)
     - `opencode/kimi-k2.5-free` (fallback)
     - `opencode/trinity-large-preview-free` (complex)
   - Reserve expensive models only for reasoning tasks

2. **Add cost tracking**
   - Implement token usage tracking
   - Set budget limits per session/day
   - Add cost alerts when approaching limits

3. **Smart fallbacks**
   - Detect task complexity automatically
   - Switch to appropriate model based on task type
   - Implement model switching logic

### Phase 4: Context Management Upgrade
**Goal**: 10-15% token cost reduction
**Timeline**: 30 minutes

#### Tasks:
1. **Switch to aggressive compaction**
   - Change compaction mode from "safeguard" to "aggressive"
   - Test for stability before full deployment
   - Monitor performance impact

2. **Implement selective memory loading**
   - Load only recent relevant files (last 3 days)
   - Add relevance scoring for memory files
   - Skip loading non-critical files

3. **Add context pruning**
   - Remove redundant information from context
   - Keep only essential recent history
   - Implement intelligent deduplication

4. **Optimize context window usage**
   - Monitor context window utilization
   - Optimize token allocation between different context types
   - Implement dynamic context sizing

### Phase 5: Monitoring & Analytics
**Goal**: Ongoing optimization
**Timeline**: Ongoing

#### Tasks:
1. **Token usage tracking**
   - Real-time token usage monitoring
   - Cost analysis by category (memory, skills, models)
   - Historical cost trends

2. **Cost optimization reports**
   - Weekly optimization reports
   - Identify new inefficiencies
   - Recommend further optimizations

3. **Performance metrics**
   - Track optimization effectiveness
   - Monitor impact on response quality
   - Balance cost vs performance

## Implementation Strategy

### Priority Order:
1. **High Priority**: Memory cleanup + Model selection (immediate 40-50% savings)
2. **Medium Priority**: Skill documentation optimization
3. **Low Priority**: Context management upgrades + monitoring

### Risk Mitigation:
- Test changes in staging environment first
- Implement roll-back capabilities
- Monitor performance after each change
- Keep backup of original configurations

### Success Metrics:
- **50-70% overall token cost reduction**
- **No degradation in response quality**
- **Improved session performance**
- **Stable operation across all features**

## Files to Modify:
1. `/root/.openclaw/openclaw.json` - Model configuration
2. `/root/.openclaw/workspace/memory/` - Memory file cleanup
3. `/root/.openclaw/workspace/skills/*/SKILL.md` - Skill documentation
4. `/root/.openclaw/workspace/AGENTS.md` - Optimization rules

## Timeline:
- **Phase 1**: Immediate (30 min)
- **Phase 2**: Within 2 hours
- **Phase 3**: Within 1 hour
- **Phase 4**: Within 1 hour
- **Phase 5**: Ongoing

## Expected Outcomes:
- **50-70% reduction in token costs**
- **Improved session performance**
- **Better resource utilization**
- **Sustainable cost management**

---

*Created: 2026-03-04*
*Task ID: 065*
*Owner: OpenCode Development Team*
# Task #047: Untruncate Description Under Activity Logs

## Overview
Activity logs table was truncating long descriptions with ellipsis, hiding important information.

## Problem
In ActivityLogTable.tsx, the description column used `max-w-xs truncate` which limited visibility.

## Solution
Removed truncation and allowed text to wrap to next row.

## Changes
- File: `frontend/src/components/ActivityLogTable.tsx`
- Line 97: Changed from `max-w-xs truncate` to `whitespace-normal`

## Status
- **Created**: 2026-02-27
- **Completed**: 2026-02-27

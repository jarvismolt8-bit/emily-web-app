# Task #049: Explore SSH-MCP for OpenCode

## Overview
Review ssh-mcp (https://github.com/tufantunc/ssh-mcp) for feasibility of integrating with OpenCode to enable SSH command execution from local machine.

## Requirements
- Review the ssh-mcp project
- Check feasibility for current setup
- Enable using OpenCode in terminal and access server through SSH from local machine

## Status
- **Created**: 2026-02-27
- **Status**: ❌ Not Implementing

## Reason for Not Implementing

### Current Setup Analysis
1. **Already have SSH access** - Kevin already SSH into the server via terminal
2. **OpenCode runs on server** - OpenCode is installed on the server and accessible via SSH
3. **No additional value** - Adding MCP layer doesn't add benefit since SSH is already working

### What is ssh-mcp?
- MCP server that exposes SSH control for Linux/Windows servers
- Enables AI assistants (Claude Code, Cursor) to execute shell commands via natural language
- Requires running MCP server on remote server

### Why Not Implemented
1. **Unnecessary complexity** - Would require running additional process on server
2. **Security considerations** - Would need to expose MCP port
3. **Redundant functionality** - SSH already provides the required access
4. **OpenCode limitation** - Open as an MCP serverCode cannot act (feature not planned - issue #3306)

### Alternative (Already in Use)
```
Kevin's Laptop → Terminal → SSH → Server → OpenCode
```
This is the current and most practical workflow.

## Conclusion
The ssh-mcp integration is not necessary for the current setup. The existing SSH access combined with OpenCode running on the server already fulfills the requirement of accessing and controlling the server via terminal.

## Related
- Task: #049
- Reference: https://github.com/tufantunc/ssh-mcp
- OpenCode MCP Issue: https://github.com/anomalyco/opencode/issues/3306

# Graph Report - toan-ai-lab  (2026-10-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 20 nodes · 18 edges · 5 communities (2 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63ba0953`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- express
- scripts

## God Nodes (most connected - your core abstractions)
1. `express` - 3 edges
2. `express@^5.3.0` - 2 edges
3. `scripts` - 2 edges
4. `author` - 1 edges
5. `keywords` - 1 edges
6. `license` - 1 edges
7. `main` - 1 edges
8. `app` - 1 edges
9. `test` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (5 total, 3 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, main, name, type, version

### Community 1 - "express"
Cohesion: 0.40
Nodes (4): dependencies, express@^5.3.0, express, app

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `package.json`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `dependencies` connect `express` to `package.json`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
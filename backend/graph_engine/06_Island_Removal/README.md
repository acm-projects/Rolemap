# Phase 7: Island Removal (Duplicate Merging)

This folder contains scripts to resolve "island concepts" in the Neo4j knowledge graph. 

## The Problem
During graph construction (scraping jobs vs generating prerequisites with LLMs), the same concept was occasionally created with different casing (e.g. `AWS` vs `Aws`). Since Neo4j strings are case-sensitive, this caused the graph to fracture:
1. `AWS` was connected to jobs.
2. `Aws` had all the learning prerequisites leading into it.
As a result, `Aws` became an "island" — a long chain of prerequisites that seemingly led nowhere, disconnected from any job roles. 

## The Solution
`merge_islands.py` performs the following steps:
1. Hardcodes fixes for known fuzzy duplicates (`Vim / Nano / Emacs` and `Networking & Protocols`).
2. Groups all concepts by their case-insensitive names (`toLower(c.name)`).
3. Selects the most "valuable" variant in each group to be the canonical node (prioritizing direct connections to `Job` nodes).
4. Iterates through all duplicates, re-routing their incoming and outgoing `PREREQUISITE_FOR` and `REQUIRES` edges to the canonical node using `MERGE` to prevent duplicate edges.
5. Detaches and deletes the leftover duplicate nodes.

## Usage
Ensure your Neo4j database is running and credentials are set in `backend/.env`.

```bash
cd backend/graph_engine/06_Island_Removal
python merge_islands.py
```
Added merge_semantic_islands.py to fix semantic shadow islands

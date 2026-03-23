import uuid
from neo4j import GraphDatabase
from datetime import datetime, timezone


class Neo4jWriter:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def write_job(self, data):
        """
        Write a fully-aggregated job record to Neo4j.

        data keys:
          display_name   — canonical display name (MERGE key), e.g. "Front-End Engineer"
          domain         — domain string, e.g. "Software Engineering"
          description    — job description text
          source         — import source tag
          import_batch   — batch id string
          skills         — list of dicts: [{name, weight, mentions, total_postings}, ...]
          companies      — list of uppercased company name strings
        """
        with self.driver.session() as session:
            session.execute_write(self._write_job_tx, data)

    @staticmethod
    def _write_job_tx(tx, data):
        display_name = data["display_name"]
        domain       = data.get("domain", "")
        description  = data.get("description", "")
        source       = str(data.get("source", "unknown")).strip().lower()
        batch        = str(data.get("import_batch", "unspecified")).strip()
        imported_at  = datetime.now(timezone.utc).isoformat()
        total_postings = data.get("total_postings", 0)

        # ---- Job node ----
        tx.run("""
            MERGE (j:Job {display_name: $display_name})
            ON CREATE SET j.id               = $id,
                          j.domain           = $domain,
                          j.description      = $description,
                          j.total_postings   = $total_postings,
                          j.source           = $source,
                          j.last_import_batch   = $batch,
                          j.last_imported_at    = $imported_at
            ON MATCH SET  j.domain           = $domain,
                          j.description      = coalesce(j.description, $description),
                          j.total_postings   = $total_postings,
                          j.source           = $source,
                          j.last_import_batch   = $batch,
                          j.last_imported_at    = $imported_at
        """, display_name=display_name, id=str(uuid.uuid4()), domain=domain,
             description=description, total_postings=total_postings,
             source=source, batch=batch, imported_at=imported_at)

        # ---- Company nodes + POSTED edges ----
        for company_name in data.get("companies", []):
            if company_name:
                tx.run("MERGE (c:Company {name: $name})", name=company_name)
                tx.run("""
                    MATCH (c:Company {name: $company_name})
                    MATCH (j:Job {display_name: $display_name})
                    MERGE (c)-[:POSTED]->(j)
                """, company_name=company_name, display_name=display_name)

        # ---- Concept nodes + REQUIRES edges ----
        for skill in data.get("skills", []):
            skill_name     = str(skill["name"]).strip().upper()
            weight         = float(skill["weight"])
            mentions       = int(skill["mentions"])
            total_post     = int(skill["total_postings"])

            tx.run("""
                MERGE (c:Concept {name: $name})
                ON CREATE SET c.id = $id, c.mention_count = $mentions
                ON MATCH SET  c.mention_count = coalesce(c.mention_count, 0) + $mentions
                WITH c
                MATCH (j:Job {display_name: $display_name})
                MERGE (j)-[r:REQUIRES]->(c)
                SET r.weight         = $weight,
                    r.mentions       = $mentions,
                    r.total_postings = $total_post,
                    r.source         = $source,
                    r.last_import_batch   = $batch,
                    r.last_imported_at    = $imported_at
            """, name=skill_name, id=str(uuid.uuid4()), mentions=mentions,
                 display_name=display_name, weight=weight, total_post=total_post,
                 source=source, batch=batch, imported_at=imported_at)

    def update_concept_job_lists(self):
        """
        Final pass: set jobs[] and job_count on every Concept node based on
        existing REQUIRES edges. Called once after all jobs are written.
        """
        with self.driver.session() as session:
            session.run("""
                MATCH (j:Job)-[:REQUIRES]->(c:Concept)
                WITH c, collect(DISTINCT j.display_name) AS job_names
                SET c.jobs      = job_names,
                    c.job_count = size(job_names)
            """)

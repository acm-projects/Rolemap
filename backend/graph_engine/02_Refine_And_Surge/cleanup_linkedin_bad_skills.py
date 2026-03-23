import os

from dotenv import load_dotenv
from neo4j import GraphDatabase


def main():
    load_dotenv('.env')
    drv = GraphDatabase.driver(
        os.getenv('NEO4J_URI'),
        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')),
    )

    blocked = [
        'MAN',
        'CAT',
        'VISION & MISSION',
        'SECURITY SKILLS AND KNOWLEDGE',
        'PENETRATION TESTING RULES OF ENGAGEMENT',
        'AI IN PRODUCT MGMT.',
        'CLOUD-NATIVE ML SERVICES',
        'DATA REPLICATION',
    ]

    noise_titles = [
        'LINKEDIN IS BETTER ON THE APP',
        'JOIN LINKEDIN',
        'AGREE & JOIN',
        'OPEN THE APP',
        'EMAIL',
    ]

    with drv.session() as s:
        q1 = "MATCH (j:Job {source:'linkedin'})-[r:REQUIRES]->(c:Concept) WHERE c.name IN $blocked DELETE r RETURN count(r) AS c"
        q2 = "MATCH (c:Company)-[p:POSTED]->(j:Job {source:'linkedin'}) WHERE j.title IN $noise_titles OR c.name CONTAINS 'HAVE THE APP' DELETE p RETURN count(p) AS c"
        q3 = "MATCH (j:Job {source:'linkedin'}) WHERE NOT (()-[:POSTED]->(j)) AND (j.title IN $noise_titles OR j.title IN ['LINKEDIN IS BETTER ON THE APP','EMAIL']) DETACH DELETE j RETURN count(j) AS c"

        r1 = s.run(q1, blocked=blocked).single()['c']
        r2 = s.run(q2, noise_titles=noise_titles).single()['c']
        r3 = s.run(q3, noise_titles=noise_titles).single()['c']

        print('DELETED_BAD_REQUIRES', r1)
        print('DELETED_NOISE_POSTED', r2)
        print('DELETED_NOISE_JOBS', r3)

    drv.close()


if __name__ == '__main__':
    main()

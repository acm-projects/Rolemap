"""
Neo4j Database Connection Manager
Singleton pattern for Neo4j driver management
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from neo4j import GraphDatabase, Driver, Session

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")


class Neo4jDriver:
    """Singleton Neo4j driver manager"""
    
    _instance: Optional[Driver] = None
    
    @classmethod
    def get_driver(cls) -> Driver:
        """Get or create Neo4j driver instance"""
        if cls._instance is None:
            cls._instance = cls._create_driver()
        return cls._instance
    
    @classmethod
    def _create_driver(cls) -> Driver:
        """Create Neo4j driver with environment configuration"""
        uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687").replace("neo4j+s://", "neo4j+ssc://")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")

        return GraphDatabase.driver(uri, auth=(user, password))
    
    @classmethod
    def get_session(cls) -> Session:
        """Get a new session from the driver"""
        return cls.get_driver().session()
    
    @classmethod
    def close(cls):
        """Close the driver connection"""
        if cls._instance:
            cls._instance.close()
            cls._instance = None


def get_neo4j_driver() -> Driver:
    """Dependency injection for FastAPI"""
    return Neo4jDriver.get_driver()


def get_neo4j_session() -> Session:
    """Dependency injection for FastAPI"""
    return Neo4jDriver.get_session()

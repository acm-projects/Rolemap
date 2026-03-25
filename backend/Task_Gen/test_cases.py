"""
COMPREHENSIVE TEST SUITE FOR ROLEMAP V2 TASK GENERATION PIPELINE
================================================================

This file defines systematic test cases to validate the V2 API-free task generation system.
Tests cover edge cases, different technology domains, and quality validation.
"""

# Test Categories
TEST_CATEGORIES = {
    "frontend": {
        "description": "Frontend web development technologies",
        "test_cases": [
            ("Frontend Engineer", "React", "useEffect Hook", "Interactive-Heavy"),
            ("Frontend Engineer", "Vue.js", "Component Props", "Interactive-Heavy"),
            ("Frontend Engineer", "JavaScript", "Promises and Async/Await", "Theory-Heavy"),
            ("Frontend Engineer", "CSS", "Grid Layout", "Hands-on-Heavy"),
            ("Frontend Engineer", "HTML", "Semantic Elements", "Interactive-Heavy"),
        ]
    },
    
    "backend": {
        "description": "Backend development and server technologies",
        "test_cases": [
            ("Backend Engineer", "Node.js", "Event Loop", "Theory-Heavy"),
            ("Backend Engineer", "Python", "Decorators", "Interactive-Heavy"),
            ("Backend Engineer", "Django", "ORM Relationships", "Hands-on-Heavy"),
            ("Backend Engineer", "Express.js", "Middleware", "Interactive-Heavy"),
            ("Backend Engineer", "FastAPI", "Dependency Injection", "Theory-Heavy"),
        ]
    },
    
    "devops": {
        "description": "DevOps, infrastructure, and deployment",
        "test_cases": [
            ("DevOps Engineer", "Docker", "Multi-stage Builds", "Hands-on-Heavy"),
            ("DevOps Engineer", "Kubernetes", "ConfigMaps", "Hands-on-Heavy"),
            ("DevOps Engineer", "Terraform", "State Management", "Theory-Heavy"),
            ("DevOps Engineer", "Jenkins", "Pipeline as Code", "Hands-on-Heavy"),
            ("DevOps Engineer", "AWS", "VPC Configuration", "Interactive-Heavy"),
        ]
    },
    
    "data_ml": {
        "description": "Data science and machine learning",
        "test_cases": [
            ("Data Scientist", "Python", "Pandas DataFrames", "Interactive-Heavy"),
            ("Data Scientist", "Machine Learning", "Feature Engineering", "Theory-Heavy"),
            ("ML Engineer", "TensorFlow", "Custom Layers", "Hands-on-Heavy"),
            ("Data Scientist", "SQL", "Window Functions", "Interactive-Heavy"),
            ("Data Scientist", "Statistics", "Hypothesis Testing", "Theory-Heavy"),
        ]
    },
    
    "security": {
        "description": "Cybersecurity and information security",
        "test_cases": [
            ("Security Engineer", "Cryptography", "Hash Functions", "Theory-Heavy"),
            ("Security Engineer", "Network Security", "Firewall Rules", "Hands-on-Heavy"),
            ("Security Engineer", "OWASP", "SQL Injection Prevention", "Interactive-Heavy"),
            ("Penetration Tester", "Web Security", "XSS Attacks", "Hands-on-Heavy"),
            ("Security Analyst", "Incident Response", "Log Analysis", "Interactive-Heavy"),
        ]
    },
    
    "database": {
        "description": "Database technologies and data management",
        "test_cases": [
            ("Database Administrator", "PostgreSQL", "Query Optimization", "Theory-Heavy"),
            ("Database Engineer", "MongoDB", "Aggregation Pipeline", "Hands-on-Heavy"),
            ("Data Engineer", "Redis", "Caching Strategies", "Interactive-Heavy"),
            ("Database Developer", "SQL", "Stored Procedures", "Hands-on-Heavy"),
            ("Data Architect", "Database Design", "Normalization", "Theory-Heavy"),
        ]
    },
    
    "edge_cases": {
        "description": "Edge cases and unusual inputs",
        "test_cases": [
            ("Software Engineer", "Git", "Merge Conflicts", "Hands-on-Heavy"),
            ("System Administrator", "Linux", "Process Management", "Interactive-Heavy"),
            ("Mobile Developer", "iOS", "SwiftUI", "Interactive-Heavy"),
            ("Game Developer", "Unity", "Physics Systems", "Hands-on-Heavy"),
            ("Blockchain Developer", "Solidity", "Smart Contracts", "Theory-Heavy"),
        ]
    }
}

# Quality Validation Criteria
QUALITY_CRITERIA = {
    "anti_hallucination": {
        "description": "All URLs must be real and accessible",
        "validation": "Check that all returned URLs return HTTP 200 or similar valid response"
    },
    
    "relevance": {
        "description": "Resources must be relevant to the concept/subtopic",
        "validation": "Check that title/description contains concept or subtopic keywords"
    },
    
    "domain_authority": {
        "description": "Prioritize official documentation and trusted sources",
        "validation": "Check for presence of official domains (react.dev, kubernetes.io, etc.)"
    },
    
    "task_balance": {
        "description": "Should generate both learning and coding tasks",
        "validation": "Check that both learning_tasks and coding_tasks arrays are populated"
    },
    
    "performance": {
        "description": "Should complete within reasonable time",
        "validation": "Each request should complete within 30 seconds"
    }
}

# Expected Success Metrics
SUCCESS_METRICS = {
    "minimum_success_rate": 90,  # At least 90% of test cases should succeed
    "minimum_learning_tasks": 1,  # At least 1 learning task per request
    "minimum_coding_tasks": 1,    # At least 1 coding task per request
    "minimum_total_resources": 10, # At least 10 total resources discovered
    "maximum_response_time": 30   # Maximum 30 seconds per request
}

print("Test suite loaded with:")
for category, data in TEST_CATEGORIES.items():
    print(f"  {category}: {len(data['test_cases'])} test cases")
    
total_tests = sum(len(data['test_cases']) for data in TEST_CATEGORIES.values())
print(f"Total test cases: {total_tests}")
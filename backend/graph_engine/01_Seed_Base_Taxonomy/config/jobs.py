"""
Job definitions: SOC codes, roadmap.sh slugs, and domain mappings.

7 Domains, 35+ Sub-Jobs:
1. Software Engineering (7 jobs)
2. Cybersecurity (7 jobs)
3. Machine Learning / Data Science (6 jobs)
4. Data Visualization (4 jobs)
5. Cloud & Infrastructure (4 jobs)
6. Technical Project Management (4 jobs)
7. DevOps (5 jobs)
"""

JOBS = [
    # =========================================================================
    # 1. SOFTWARE ENGINEERING (7 jobs)
    # =========================================================================
    {
        "display_name": "Front-End Engineer",
        "soc_code": "15-1254.00",
        "roadmap_slug": "frontend",
        "domain": "Software Engineering",
        "description": "Works on UI/UX using React, Angular, Vue, HTML, CSS, JavaScript",
    },
    {
        "display_name": "Back-End Engineer",
        "soc_code": "15-1252.00",
        "roadmap_slug": "backend",
        "domain": "Software Engineering",
        "description": "Server-side logic, APIs, databases (Java, Python, Go, SQL)",
    },
    {
        "display_name": "Full-Stack Engineer",
        "soc_code": "15-1254.00",
        "roadmap_slug": "full-stack",
        "domain": "Software Engineering",
        "description": "Both front-end and back-end development",
    },
    {
        "display_name": "Mobile Engineer (Android)",
        "soc_code": "15-1252.01",
        "roadmap_slug": "android",
        "domain": "Software Engineering",
        "description": "Android development using Kotlin, Java",
    },
    {
        "display_name": "Mobile Engineer (iOS)",
        "soc_code": "15-1252.01",
        "roadmap_slug": "ios",
        "domain": "Software Engineering",
        "description": "iOS development using Swift, SwiftUI",
    },
    {
        "display_name": "Systems Engineer",
        "soc_code": "15-1252.00",
        "roadmap_slug": "backend",  # closest roadmap
        "domain": "Software Engineering",
        "description": "OS-level development, distributed systems, performance optimization",
    },
    {
        "display_name": "Game Developer",
        "soc_code": "15-1252.00",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Software Engineering",
        "description": "Game engines (Unity, Unreal), graphics, physics systems",
    },
    # =========================================================================
    # 2. CYBERSECURITY (7 jobs)
    # =========================================================================
    {
        "display_name": "Security Analyst",
        "soc_code": "15-1212.00",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Monitors threats, incident response",
    },
    {
        "display_name": "Penetration Tester",
        "soc_code": "15-1299.05",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Ethical hacking, simulates attacks, finds vulnerabilities",
    },
    {
        "display_name": "Security Engineer",
        "soc_code": "15-1212.00",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Builds secure infrastructure, firewalls, encryption",
    },
    {
        "display_name": "Cloud Security Engineer",
        "soc_code": "15-1212.00",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Secures AWS/Azure/GCP environments, IAM, compliance",
    },
    {
        "display_name": "SOC Analyst",
        "soc_code": "15-1212.00",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Works in Security Operations Center, monitors alerts",
    },
    {
        "display_name": "Application Security Engineer",
        "soc_code": "15-1212.00",
        "roadmap_slug": "cyber-security",
        "domain": "Cybersecurity",
        "description": "Secure coding practices, code vulnerability scanning",
    },
    {
        "display_name": "GRC Analyst",
        "soc_code": "15-1212.00",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Cybersecurity",
        "description": "Governance, Risk & Compliance, security policies, regulatory compliance",
    },
    # =========================================================================
    # 3. MACHINE LEARNING / DATA SCIENCE (6 jobs)
    # =========================================================================
    {
        "display_name": "Machine Learning Engineer",
        "soc_code": "15-2051.00",
        "roadmap_slug": "mlops",
        "domain": "Machine Learning",
        "description": "Deploys ML models into production, scalability focus",
    },
    {
        "display_name": "Data Scientist",
        "soc_code": "15-2051.01",
        "roadmap_slug": "data-science",
        "domain": "Machine Learning",
        "description": "Statistical analysis, modeling, Python, R, SQL",
    },
    {
        "display_name": "AI Engineer",
        "soc_code": "15-2051.00",
        "roadmap_slug": "ai-data-scientist",
        "domain": "Machine Learning",
        "description": "Deep learning, general AI systems",
    },
    {
        "display_name": "NLP Engineer",
        "soc_code": "15-2051.00",
        "roadmap_slug": "ai-data-scientist",
        "domain": "Machine Learning",
        "description": "Chatbots, language models, text processing",
    },
    {
        "display_name": "Computer Vision Engineer",
        "soc_code": "15-2051.00",
        "roadmap_slug": "ai-data-scientist",
        "domain": "Machine Learning",
        "description": "Image recognition, video analysis systems",
    },
    {
        "display_name": "Research Scientist",
        "soc_code": "15-2051.00",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Machine Learning",
        "description": "Develops new ML/AI algorithms, publishes research",
    },
    # =========================================================================
    # 4. DATA VISUALIZATION (4 jobs)
    # =========================================================================
    {
        "display_name": "BI Developer",
        "soc_code": "15-1211.01",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Data Visualization",
        "description": "Power BI, Tableau, business dashboards",
    },
    {
        "display_name": "Data Visualization Engineer",
        "soc_code": "15-1211.01",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Data Visualization",
        "description": "D3.js, interactive web dashboards",
    },
    {
        "display_name": "Analytics Engineer",
        "soc_code": "15-1211.01",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Data Visualization",
        "description": "Bridges data engineering and analytics, builds clean data models",
    },
    {
        "display_name": "Reporting Analyst",
        "soc_code": "15-1211.01",
        "roadmap_slug": None,  # LLM gap-fill
        "domain": "Data Visualization",
        "description": "KPIs, business metrics tracking, reports",
    },
    # =========================================================================
    # 5. CLOUD & INFRASTRUCTURE (4 jobs)
    # =========================================================================
    {
        "display_name": "Cloud Infrastructure Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "Cloud & Infrastructure",
        "description": "AWS, Azure, GCP - networking, compute, storage",
    },
    {
        "display_name": "Cloud Architect",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "Cloud & Infrastructure",
        "description": "Designs scalable cloud systems",
    },
    {
        "display_name": "Site Reliability Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "Cloud & Infrastructure",
        "description": "Reliability, uptime, monitoring",
    },
    {
        "display_name": "Platform Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "Cloud & Infrastructure",
        "description": "Internal developer platforms, tooling",
    },
    # =========================================================================
    # 6. TECHNICAL PROJECT MANAGEMENT (4 jobs)
    # =========================================================================
    {
        "display_name": "Technical Project Manager",
        "soc_code": "11-3021.00",
        "roadmap_slug": "product-manager",
        "domain": "Technical Project Management",
        "description": "Manages technical teams and delivery",
    },
    {
        "display_name": "Agile Project Manager",
        "soc_code": "11-3021.00",
        "roadmap_slug": "product-manager",
        "domain": "Technical Project Management",
        "description": "Scrum, sprint planning, agile ceremonies",
    },
    {
        "display_name": "Program Manager",
        "soc_code": "11-3021.00",
        "roadmap_slug": "product-manager",
        "domain": "Technical Project Management",
        "description": "Oversees multiple projects, cross-team coordination",
    },
    {
        "display_name": "Scrum Master",
        "soc_code": "11-3021.00",
        "roadmap_slug": "product-manager",
        "domain": "Technical Project Management",
        "description": "Facilitates agile process, removes blockers",
    },
    # =========================================================================
    # 7. DEVOPS (5 jobs)
    # =========================================================================
    {
        "display_name": "DevOps Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "DevOps",
        "description": "Automating development and deployment pipelines",
    },
    {
        "display_name": "CI/CD Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "DevOps",
        "description": "Jenkins, GitHub Actions, build pipelines",
    },
    {
        "display_name": "Infrastructure as Code Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "DevOps",
        "description": "Terraform, CloudFormation, Pulumi",
    },
    {
        "display_name": "Release Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "DevOps",
        "description": "Manages software releases, versioning",
    },
    {
        "display_name": "Containerization Engineer",
        "soc_code": "15-1244.00",
        "roadmap_slug": "devops",
        "domain": "DevOps",
        "description": "Docker, Kubernetes, container orchestration",
    },
]

DOMAINS = [
    "Software Engineering",
    "Cybersecurity",
    "Machine Learning",
    "Data Visualization",
    "Cloud & Infrastructure",
    "Technical Project Management",
    "DevOps",
]

# Map domain name → keywords used to assign concepts to domains in processor.py
DOMAIN_KEYWORDS = {
    "Software Engineering": [
        "html", "css", "javascript", "typescript", "react", "vue", "angular",
        "node", "python", "java", "golang", "rust", "ruby", "php", "sql",
        "api", "rest", "graphql", "database", "git", "testing", "frontend",
        "backend", "web", "http", "dom", "component", "framework", "library",
        "algorithm", "data structure", "oop", "functional", "async",
        "swift", "kotlin", "flutter", "react native", "unity", "unreal",
        "game engine", "graphics", "physics", "distributed systems",
    ],
    "Cybersecurity": [
        "security", "penetration", "exploit", "vulnerability", "firewall",
        "encryption", "cryptography", "authentication", "authorization",
        "owasp", "ctf", "forensics", "malware", "network security",
        "incident response", "siem", "intrusion", "threat", "soc",
        "appsec", "secure coding", "compliance", "governance", "risk",
        "iam", "zero trust", "cloud security", "devsecops",
    ],
    "Machine Learning": [
        "machine learning", "deep learning", "neural network", "nlp",
        "computer vision", "model", "training", "inference", "pytorch",
        "tensorflow", "scikit", "statistics", "probability", "regression",
        "classification", "clustering", "feature engineering", "mlops",
        "data science", "pandas", "numpy", "jupyter", "experiment",
        "transformer", "llm", "gpt", "bert", "huggingface", "opencv",
        "image recognition", "chatbot", "language model",
    ],
    "Data Visualization": [
        "visualization", "dashboard", "bi", "business intelligence",
        "tableau", "power bi", "reporting", "etl", "data warehouse",
        "looker", "chart", "analytics", "metric", "kpi", "d3.js",
        "superset", "metabase", "dbt", "data modeling", "sql",
    ],
    "Cloud & Infrastructure": [
        "cloud", "aws", "azure", "gcp", "infrastructure",
        "serverless", "monitoring", "logging",
        "scaling", "loadbalancer", "networking", "vpc",
        "lambda", "ec2", "s3", "cdn", "dns", "ssl",
    ],
    "Technical Project Management": [
        "agile", "scrum", "kanban", "roadmap", "sprint", "backlog",
        "stakeholder", "requirement", "product", "planning", "jira",
        "confluence", "okr", "prioritization", "communication",
        "project management", "program management", "cross-functional",
    ],
    "DevOps": [
        "devops", "ci/cd", "cicd", "continuous integration", "continuous deployment",
        "jenkins", "github actions", "gitlab ci", "circleci", "pipeline",
        "terraform", "cloudformation", "pulumi", "ansible", "chef", "puppet",
        "docker", "kubernetes", "k8s", "container", "helm", "istio",
        "deployment", "release", "versioning", "infrastructure as code",
        "iac", "gitops", "argocd", "flux",
    ],
}

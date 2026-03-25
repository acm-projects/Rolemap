"""
Pydantic models for Rolemap API
Request/Response schemas
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Concept Models
# ============================================================================

class ConceptNode(BaseModel):
    """A single concept node in the learning graph"""
    name: str
    level: Optional[int] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "React",
                "level": 4,
                "domain": "frontend",
                "description": "JavaScript library for building user interfaces"
            }
        }


class ConceptWithHop(ConceptNode):
    """Concept node with hop distance"""
    hop: int = Field(..., description="Distance from source in hops")


# ============================================================================
# Endpoint 1: Prerequisites Path (BFS)
# ============================================================================

class PrerequisitesPathRequest(BaseModel):
    """Request for prerequisite path between two concepts"""
    foundation: str = Field(..., description="Starting concept name")
    advanced: str = Field(..., description="Target concept name")
    include_intermediate: bool = Field(default=True, description="Include all intermediate nodes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "foundation": "Internet",
                "advanced": "React",
                "include_intermediate": True
            }
        }


class PrerequisitesPathResponse(BaseModel):
    """Response with complete prerequisite path"""
    path: List[ConceptWithHop]
    total_hops: int
    estimated_learning_time: str
    domain_transitions: int
    path_quality: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "path": [
                    {"name": "Internet", "level": 1, "domain": "frontend", "hop": 0},
                    {"name": "HTML Fundamentals", "level": 1, "domain": "frontend", "hop": 1},
                    {"name": "React", "level": 4, "domain": "frontend", "hop": 5}
                ],
                "total_hops": 5,
                "estimated_learning_time": "8-12 weeks",
                "domain_transitions": 0,
                "path_quality": "optimal"
            }
        }


# ============================================================================
# Endpoint 2: Roadmap Generation (Kahn's)
# ============================================================================

class RoadmapGenerateRequest(BaseModel):
    """Request for learning roadmap generation"""
    target_concept: str = Field(..., description="Target concept/skill to reach")
    current_skills: List[str] = Field(default_factory=list, description="Skills user already has")
    include_optional: bool = Field(default=False, description="Include optional skills")
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_concept": "React",
                "current_skills": ["HTML", "CSS"],
                "include_optional": False
            }
        }


class RoadmapStep(BaseModel):
    """Single step in a learning roadmap"""
    order: int = Field(..., description="Step number in sequence")
    concept: str
    prerequisites_met: List[str] = Field(default_factory=list, description="Prerequisites already completed")
    estimated_duration: str = Field(default="1-2 weeks")
    resources: List[str] = Field(default_factory=list, description="Learning resources for this step")


class RoadmapGenerateResponse(BaseModel):
    """Complete learning roadmap"""
    target_concept: str
    current_skills: List[str]
    missing_skills: List[str]
    roadmap: List[RoadmapStep]
    total_steps: int
    estimated_total_time: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_concept": "React",
                "current_skills": ["HTML", "CSS"],
                "missing_skills": ["JavaScript", "React", "Testing"],
                "roadmap": [
                    {"order": 1, "concept": "JavaScript Fundamentals", "prerequisites_met": [], "estimated_duration": "2-3 weeks"},
                    {"order": 2, "concept": "DOM Manipulation", "prerequisites_met": ["JavaScript Fundamentals"], "estimated_duration": "1 week"}
                ],
                "total_steps": 8,
                "estimated_total_time": "16-20 weeks"
            }
        }


# ============================================================================
# Endpoint 3: Skill Gap Analysis (Bidirectional BFS)
# ============================================================================

class SkillGapAnalysisRequest(BaseModel):
    """Request for skill gap analysis"""
    current_skills: List[str] = Field(..., description="User's current skills")
    target_skill: str = Field(..., description="Target skill to reach")
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_skills": ["HTML", "CSS", "JavaScript Basics"],
                "target_skill": "React"
            }
        }


class SkillGapAnalysisResponse(BaseModel):
    """Skill gap analysis result"""
    target_skill: str
    missing_path: List[str] = Field(..., description="Ordered list of missing concepts to reach target")
    gap_size: int = Field(..., description="Number of missing steps")
    estimated_time: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_skill": "React",
                "missing_path": ["DOM Manipulation", "Advanced JavaScript Concepts", "Frontend Framework Fundamentals", "React"],
                "gap_size": 4,
                "estimated_time": "4-6 weeks"
            }
        }


# ============================================================================
# Endpoint 4: Task Generation (API-Free)
# ============================================================================

class LearningTask(BaseModel):
    """A single learning task"""
    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    url: str = Field(..., description="Resource URL")
    type: str = Field(..., description="Task type: Learning or Coding")
    curated_by: str = Field(default="rule-based (no hallucination)")


class TaskGenerationRequest(BaseModel):
    """Request for task generation"""
    job: str = Field(..., description="Job profile (e.g., 'Backend Engineer')")
    concept: str = Field(..., description="Concept name")
    subtopic: str = Field(..., description="Subtopic name")
    preference: str = Field(default="Interactive-Heavy", description="Learning preference")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job": "Backend Engineer",
                "concept": "Docker",
                "subtopic": "Container Networking",
                "preference": "Hands-on-Heavy"
            }
        }


class TaskGenerationResponse(BaseModel):
    """Response with generated tasks"""
    metadata: dict = Field(..., description="Generation metadata")
    learning_tasks: List[LearningTask] = Field(default_factory=list, description="Learning resources")
    coding_tasks: List[LearningTask] = Field(default_factory=list, description="Coding exercises")
    total_resources_found: int = Field(..., description="Total resources discovered")
    
    class Config:
        json_schema_extra = {
            "example": {
                "metadata": {
                    "concept": "Docker",
                    "subtopic": "Container Networking",
                    "preference": "Hands-on-Heavy",
                    "api_calls_made": 0,
                    "mode": "API-FREE"
                },
                "learning_tasks": [
                    {
                        "title": "Docker Networking",
                        "description": "Learn Container Networking from official Docker docs",
                        "url": "https://docs.docker.com/engine/network/",
                        "type": "Learning",
                        "curated_by": "rule-based (no hallucination)"
                    }
                ],
                "coding_tasks": [],
                "total_resources_found": 10
            }
        }


# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    status_code: int

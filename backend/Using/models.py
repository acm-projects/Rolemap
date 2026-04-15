"""
Pydantic models for Rolemap API
Request/Response schemas
"""

from typing import Any, Dict, List, Optional
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
# Endpoint 5: Quiz Generation
# ============================================================================

class QuizQuestion(BaseModel):
    """A single quiz question"""
    question: str
    type: str = Field(..., description="multiple_choice | true_false | short_answer | code_challenge")
    options: List[str] = Field(default_factory=list, description="Answer options (MCQ/T_F only)")
    correct_answer: str
    explanation: str
    difficulty: int
    topic: str


class QuizGenerationRequest(BaseModel):
    """Request for quiz generation"""
    topics: List[str] = Field(..., description="Concept/node names to test")
    learned_resources: List[str] = Field(default_factory=list, description="URLs/titles the user has already studied")
    difficulty: int = Field(default=3, ge=1, le=5, description="Difficulty 1 (Beginner) to 5 (Expert)")
    learning_style: str = Field(default="Interactive-Heavy", description="Learner preference")

    class Config:
        json_schema_extra = {
            "example": {
                "topics": ["Docker", "Container Networking"],
                "learned_resources": ["https://docs.docker.com/engine/network/"],
                "difficulty": 3,
                "learning_style": "Hands-on"
            }
        }


class QuizGenerationResponse(BaseModel):
    """Response with generated quiz questions"""
    metadata: dict = Field(..., description="Generation metadata")
    questions: List[QuizQuestion]
    total_questions: int

    class Config:
        json_schema_extra = {
            "example": {
                "metadata": {
                    "topics": ["Docker"],
                    "difficulty": 3,
                    "difficulty_label": "Intermediate",
                    "learning_style": "Hands-on",
                    "resources_used": 1,
                    "processing_time_seconds": 2.1,
                    "model": "gemini-2.0-flash"
                },
                "questions": [
                    {
                        "question": "Which Docker network driver isolates containers on a single host?",
                        "type": "multiple_choice",
                        "options": ["A. host", "B. overlay", "C. bridge", "D. macvlan"],
                        "correct_answer": "C",
                        "explanation": "The bridge driver is the default and creates an isolated network on a single host.",
                        "difficulty": 3,
                        "topic": "Docker"
                    }
                ],
                "total_questions": 7
            }
        }


# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    status_code: int


# ============================================================================
# Project Generation
# ============================================================================

class EvaluationSection(BaseModel):
    """Evaluation result for a single dimension"""
    score: int = Field(..., ge=0, le=100)
    positives: List[str] = Field(default_factory=list, description="What was done well")
    negatives: List[str] = Field(default_factory=list, description="What needs improvement")
    feedback: str = Field(..., description="Narrative feedback for this dimension")


class AIDetectionSection(EvaluationSection):
    """AI detection result — score = confidence (0-100) that AI wrote the code"""
    is_likely_ai: bool = Field(..., description="True if AI confidence score > 65")


class ConceptMasterySection(EvaluationSection):
    """Concept mastery evaluation"""
    concepts_demonstrated: List[str] = Field(default_factory=list)
    concepts_missing: List[str] = Field(default_factory=list)


class ProjectGenerateRequest(BaseModel):
    """Request for project idea generation"""
    concepts: List[str] = Field(..., min_length=1, description="Concepts the project must test")
    difficulty: int = Field(..., ge=1, le=5, description="Difficulty 1 (Beginner) to 5 (Expert)")
    user_info: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional learner context: level, preferred_language, background"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "concepts": ["React hooks", "useEffect", "useState"],
                "difficulty": 2,
                "user_info": {"level": "junior", "preferred_language": "JavaScript"}
            }
        }


class ProjectGenerateResponse(BaseModel):
    """Generated project prompt"""
    project_title: str
    project_description: str
    requirements: List[str]
    tech_stack: List[str]
    success_criteria: List[str]
    bonus_challenges: List[str]
    estimated_hours: int
    concepts_tested: List[str]


class ProjectEvaluateRequest(BaseModel):
    """Request for GitHub project evaluation"""
    github_url: str = Field(
        ...,
        description="GitHub repo URL (https://github.com/user/repo) or shorthand (user/repo)"
    )
    concepts: List[str] = Field(..., description="Concepts this project should demonstrate")
    project_description: Optional[str] = Field(
        default=None,
        description="Original project prompt if available"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/octocat/Hello-World",
                "concepts": ["React hooks", "useEffect", "useState"],
                "project_description": "Build a data fetching dashboard using React hooks."
            }
        }


class ProjectEvaluateResponse(BaseModel):
    """Full project evaluation result"""
    overall_score: int = Field(..., ge=0, le=100)
    code_quality: EvaluationSection
    ai_detection: AIDetectionSection
    project_structure: EvaluationSection
    concept_mastery: ConceptMasterySection
    overall_feedback: str = Field(..., description="2-3 paragraph constructive summary")
    recommendations: List[str] = Field(..., description="3-5 specific actionable next steps")


# ============================================================================
# Shop & skill decay (mock_db / user_state)
# ============================================================================

class ShopPurchaseRequest(BaseModel):
    """Buy a cosmetic shop item with XP."""
    category: str = Field(..., description="skin | eyes | clothes | pants | shoes | hair | accessories")
    item_id: str = Field(..., description="Catalog item id")


class ShopAppearancePatch(BaseModel):
    """Persist equipped layers and palette choices."""
    equipped: Dict[str, str]
    gender: Optional[str] = Field(default=None, description="boy | girl")
    color_variants: Optional[Dict[str, int]] = None


class SkillDecayReviewRequest(BaseModel):
    """Record an SM-2 review for a roadmap checkpoint."""
    id: str = Field(..., description="Checkpoint id")
    quality: int = Field(..., ge=0, le=5, description="SM-2 quality (0=forgot … 5=perfect)")

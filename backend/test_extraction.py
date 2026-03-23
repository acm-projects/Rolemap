from scraping.llm_parser import extract_jobs_from_text, flush_audit_csvs, get_audit_data
import os
from dotenv import load_dotenv

def main():
    load_dotenv()
    
    sample_text = """
    Software Engineer - Frontend
    Google DeepMind - New York, NY
    
    Responsibilities:
    Build mobile-friendly user experiences for Gemini App.
    Collaborate with AI and backend engineers.
    
    Requirements:
    - 5+ years of experience with React and TypeScript.
    - Strong knowledge of HTML, CSS, and JavaScript.
    - Experience with GraphQL and REST APIs.
    - Python programming is a plus.
    """
    
    print("--- Running Test Extraction ---")
    jobs = extract_jobs_from_text(sample_text, "Front-End Engineer")
    
    print("\n--- Results ---")
    if not jobs:
        print("FAILED: No jobs were extracted.")
    else:
        for j in jobs:
            print(f"Company: {j.get('company_name')}")
            print(f"Role: {j.get('job_name')}")
            print(f"Skills: {j.get('qualifications')}")
            print(f"Description: {j.get('description')}")
    
    flush_audit_csvs()
    job_audit, skill_audit = get_audit_data()
    print(f"\nAudit: {len(job_audit)} jobs, {len(skill_audit)} skills logged.")

if __name__ == "__main__":
    main()

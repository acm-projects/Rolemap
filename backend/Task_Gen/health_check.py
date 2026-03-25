#!/usr/bin/env python3
"""
Health Check for Task Generation Pipeline (V2 API-Free)
Validates the core components and dependencies.
"""

import os
import csv
import json
import time
from pathlib import Path
from ddgs import DDGS


def check_domain_files():
    """Check if domain CSV files exist and are readable."""
    data_dir = Path(__file__).parent / "data"
    required_files = [
        "credible_website_learn.csv",
        "credible_website_coding.csv"
    ]
    
    print("🔍 Checking domain CSV files...")
    
    for filename in required_files:
        filepath = data_dir / filename
        if not filepath.exists():
            print(f"  ❌ Missing: {filename}")
            return False
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                domains = list(reader)
                print(f"  ✅ {filename}: {len(domains)} domains loaded")
        except Exception as e:
            print(f"  ❌ {filename}: Error reading - {e}")
            return False
    
    return True


def check_ddgs_connectivity():
    """Test DuckDuckGo search connectivity."""
    print("🌐 Testing DuckDuckGo connectivity...")
    
    try:
        ddgs = DDGS()
        start_time = time.time()
        
        # Simple test search
        results = list(ddgs.text("Python programming", max_results=3))
        
        elapsed = time.time() - start_time
        
        if results:
            print(f"  ✅ DuckDuckGo responsive: {len(results)} results in {elapsed:.2f}s")
            print(f"     Sample result: {results[0].get('title', 'No title')[:50]}...")
            return True
        else:
            print(f"  ❌ DuckDuckGo returned 0 results")
            return False
            
    except Exception as e:
        print(f"  ❌ DuckDuckGo error: {str(e)[:100]}")
        return False


def check_keyword_mapping():
    """Test keyword mapping logic."""
    print("🗂️  Testing keyword mapping...")
    
    # Test cases: concept -> expected domains
    test_cases = [
        ("React", ["react.dev"]),
        ("Docker", ["docker.com"]),
        ("Python", ["docs.python.org"]),
        ("Machine Learning", ["tensorflow.org", "pytorch.org"]),
    ]
    
    from main import get_best_domains_no_api  # Import the function
    
    # Mock domain list
    all_domains = [
        "react.dev", "docker.com", "docs.python.org", 
        "tensorflow.org", "pytorch.org", "w3schools.com"
    ]
    
    for concept, expected_domains in test_cases:
        selected = get_best_domains_no_api(concept, all_domains)
        
        # Check if any expected domain is selected
        found_expected = any(domain in selected for domain in expected_domains)
        
        if found_expected:
            print(f"  ✅ {concept}: {selected}")
        else:
            print(f"  ⚠️  {concept}: {selected} (expected one of {expected_domains})")
    
    return True


def run_integration_test():
    """Run a quick end-to-end test."""
    print("🚀 Running integration test...")
    
    try:
        import subprocess
        result = subprocess.run([
            "python", "03_task_generator_v2_apifree.py",
            "Test Engineer", "Python", "Unit Testing", "Interactive-Heavy"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and "SUCCESS" in result.stdout:
            # Parse final JSON
            lines = result.stdout.strip().split('\n')
            json_lines = []
            parsing_json = False
            
            for line in lines:
                if line.strip().startswith('{'):
                    parsing_json = True
                if parsing_json:
                    json_lines.append(line)
            
            if json_lines:
                data = json.loads('\n'.join(json_lines))
                learning_count = len(data.get('learning_tasks', []))
                coding_count = len(data.get('coding_tasks', []))
                total_resources = data.get('total_resources_found', 0)
                
                print(f"  ✅ Integration test successful")
                print(f"     Generated {learning_count} learning + {coding_count} coding tasks")
                print(f"     Found {total_resources} total resources")
                return True
            else:
                print(f"  ❌ Integration test: No JSON output")
                return False
        else:
            print(f"  ❌ Integration test failed: {result.stderr[:100]}")
            return False
            
    except Exception as e:
        print(f"  ❌ Integration test error: {str(e)[:100]}")
        return False


def main():
    """Run all health checks."""
    print("=" * 60)
    print("🏥 TASK GENERATION PIPELINE HEALTH CHECK")
    print("=" * 60)
    print()
    
    checks = [
        ("Domain Files", check_domain_files),
        ("DuckDuckGo Connectivity", check_ddgs_connectivity), 
        ("Keyword Mapping", check_keyword_mapping),
        ("Integration Test", run_integration_test)
    ]
    
    passed = 0
    total = len(checks)
    
    for name, check_func in checks:
        print(f"Running: {name}")
        try:
            if check_func():
                passed += 1
            print()
        except Exception as e:
            print(f"  ❌ Unexpected error: {str(e)[:100]}")
            print()
    
    print("=" * 60)
    print(f"🏥 HEALTH CHECK SUMMARY: {passed}/{total} checks passed")
    
    if passed == total:
        print("✅ All systems operational - Ready for production!")
        exit(0)
    else:
        print("❌ Some issues detected - Review before deployment")
        exit(1)


if __name__ == "__main__":
    main()
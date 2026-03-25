"""
AUTOMATED TEST RUNNER FOR ROLEMAP V2 TASK GENERATION
===================================================

Executes all test cases and validates quality criteria.
"""

import subprocess
import json
import time
from test_cases import TEST_CATEGORIES, QUALITY_CRITERIA, SUCCESS_METRICS

def run_test_case(job, concept, subtopic, preference, timeout=30):
    """Run a single test case using V3 intelligent hybrid generator."""
    start_time = time.time()
    
    try:
        result = subprocess.run([
            'python', '03_task_generator_v3_intelligent.py',
            job, concept, subtopic, preference
        ], capture_output=True, text=True, timeout=timeout)
        
        elapsed_time = time.time() - start_time
        
        if result.returncode == 0:
            # Extract JSON from output
            output_lines = result.stdout.strip().split('\n')
            json_start = None
            
            for i, line in enumerate(output_lines):
                if line.strip().startswith('{'):
                    json_start = i
                    break
            
            if json_start is not None:
                json_str = '\n'.join(output_lines[json_start:])
                data = json.loads(json_str)
                
                return {
                    'success': True,
                    'data': data,
                    'elapsed_time': elapsed_time,
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'data': None,
                    'elapsed_time': elapsed_time,
                    'error': 'No JSON output found'
                }
        else:
            return {
                'success': False,
                'data': None, 
                'elapsed_time': elapsed_time,
                'error': f'Exit code {result.returncode}: {result.stderr[:200]}'
            }
            
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'data': None,
            'elapsed_time': timeout,
            'error': f'Timeout after {timeout}s'
        }
    except Exception as e:
        return {
            'success': False,
            'data': None,
            'elapsed_time': time.time() - start_time,
            'error': f'Exception: {str(e)[:200]}'
        }

def validate_quality(result_data):
    """Validate quality criteria for a successful result."""
    if not result_data:
        return {'score': 0, 'details': 'No data to validate'}
    
    score = 0
    details = {}
    
    # Check task balance
    learning_tasks = len(result_data.get('learning_tasks', []))
    coding_tasks = len(result_data.get('coding_tasks', []))
    
    details['learning_tasks'] = learning_tasks
    details['coding_tasks'] = coding_tasks
    
    if learning_tasks >= SUCCESS_METRICS['minimum_learning_tasks']:
        score += 25
    if coding_tasks >= SUCCESS_METRICS['minimum_coding_tasks']:
        score += 25
    
    # Check resource count
    total_resources = result_data.get('total_resources_found', 0)
    details['total_resources'] = total_resources
    
    if total_resources >= SUCCESS_METRICS['minimum_total_resources']:
        score += 25
    
    # Check for real URLs (basic validation)
    all_tasks = result_data.get('learning_tasks', []) + result_data.get('coding_tasks', [])
    valid_urls = 0
    
    for task in all_tasks:
        url = task.get('url', '')
        if url.startswith('http') and '.' in url:
            valid_urls += 1
    
    details['valid_urls'] = f"{valid_urls}/{len(all_tasks)}"
    
    if len(all_tasks) > 0 and valid_urls == len(all_tasks):
        score += 25
    
    return {'score': score, 'details': details}

def run_category_tests(category_name, test_cases):
    """Run all tests for a category."""
    print(f"\n--- TESTING CATEGORY: {category_name.upper()} ---")
    
    results = []
    
    for i, (job, concept, subtopic, preference) in enumerate(test_cases):
        print(f"Test {i+1}/{len(test_cases)}: {concept} -> {subtopic}")
        
        result = run_test_case(job, concept, subtopic, preference)
        
        if result['success']:
            quality = validate_quality(result['data'])
            result['quality'] = quality
            
            print(f"  SUCCESS: {quality['score']}/100 quality score")
            print(f"    Learning: {quality['details']['learning_tasks']}, "
                  f"Coding: {quality['details']['coding_tasks']}, "
                  f"Resources: {quality['details']['total_resources']}")
        else:
            result['quality'] = {'score': 0, 'details': {}}
            print(f"  FAILED: {result['error'][:50]}...")
        
        results.append(result)
        time.sleep(1)  # Rate limiting
    
    return results

def main():
    """Run the complete test suite for V3 intelligent hybrid generator."""
    print("=" * 60)
    print("ROLEMAP V3 INTELLIGENT HYBRID - COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    
    all_results = {}
    total_tests = 0
    total_successes = 0
    total_quality_score = 0
    
    # Run tests for each category
    for category_name, category_data in TEST_CATEGORIES.items():
        test_cases = category_data['test_cases']
        results = run_category_tests(category_name, test_cases)
        
        all_results[category_name] = results
        
        # Category stats
        category_successes = sum(1 for r in results if r['success'])
        category_quality = sum(r['quality']['score'] for r in results) / len(results)
        
        print(f"Category Summary: {category_successes}/{len(results)} passed, "
              f"avg quality: {category_quality:.1f}/100")
        
        total_tests += len(results)
        total_successes += category_successes
        total_quality_score += sum(r['quality']['score'] for r in results)
    
    # Final summary
    print("\n" + "=" * 60)
    print("FINAL TEST RESULTS")
    print("=" * 60)
    
    success_rate = (total_successes / total_tests) * 100
    avg_quality = total_quality_score / total_tests
    
    print(f"Overall Success Rate: {total_successes}/{total_tests} ({success_rate:.1f}%)")
    print(f"Average Quality Score: {avg_quality:.1f}/100")
    
    # Validate against success metrics
    print(f"\nSUCCESS CRITERIA:")
    print(f"  Minimum Success Rate: {SUCCESS_METRICS['minimum_success_rate']}% "
          f"({'PASS' if success_rate >= SUCCESS_METRICS['minimum_success_rate'] else 'FAIL'})")
    
    if success_rate >= SUCCESS_METRICS['minimum_success_rate'] and avg_quality >= 75:
        print("\n🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!")
        return True
    else:
        print("\n❌ SOME TESTS FAILED - REVIEW REQUIRED")
        return False

if __name__ == "__main__":
    main()
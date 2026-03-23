# Normalization Testing

This folder is for iterating on LinkedIn normalization logic without touching the main pipeline.

## Files

- `in.csv`: your input scraped LinkedIn CSV
- `normalize_linkedin_csv.py`: standalone normalization + dynamic skill extraction logic
- `out.csv`: generated normalized result

## Run

From `d:\Noobcept\Rolemap\normalization_testing`:

```powershell
python normalize_linkedin_csv.py --in in.csv --out out.csv
```

Drop rows that look like LinkedIn login/app noise:

```powershell
python normalize_linkedin_csv.py --in in.csv --out out.csv --drop-noise
```

## Output Columns

- `company`
- `job`
- `original_skills`
- `normalized_skills`
- `skill_count`
- `is_noise_row`

This script supports both input styles:

- scrape-style columns: `company_name`, `job_name`, `description`, `qualifications`
- report-style columns: `company`, `job`, `skills`

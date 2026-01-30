# Market Agent Daily Update - Setup Instructions
# =============================================

## What's Been Created

1. **update_market_db.py** - Main update script with incremental data processing
2. **daily_update.ps1** - PowerShell wrapper for Task Scheduler
3. **VasudhaMarketUpdate.xml** - Task Scheduler configuration (daily at 6 PM)

## Setup Instructions

### Step 1: Test the Update Script

```powershell
cd C:\vasudha-project\backend\agents\market_agent
.\venv\Scripts\Activate.ps1

# Test with dry run (preview only)
python update_market_db.py --dry-run

# If it looks good, do a real update
python update_market_db.py
```

### Step 2: Setup Task Scheduler (Automated Daily Updates)

#### Option A: Import XML Configuration (Recommended)

1. Open **Task Scheduler** (Windows key + R → `taskschd.msc`)
2. Right-click **Task Scheduler Library**
3. Select **Import Task...**
4. Browse to: `C:\vasudha-project\backend\agents\market_agent\scheduler\VasudhaMarketUpdate.xml`
5. Click **Open** → Task will be created with all settings

#### Option B: Manual Task Creation

1. Open **Task Scheduler**
2. Click **Create Task**
3. **General Tab:**
   - Name: `Vasudha Market Update`
   - Description: `Daily market data update for Vasudha project`
   - Run whether user is logged on or not: ✓
4. **Triggers Tab:**
   - New → Daily at 6:00 PM
   - Repeat: Every 1 days
5. **Actions Tab:**
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\vasudha-project\backend\agents\market_agent\scheduler\daily_update.ps1"`
   - Start in: `C:\vasudha-project\backend\agents\market_agent`

### Step 3: Test the Scheduler

```powershell
# Test the PowerShell script manually
C:\vasudha-project\backend\agents\market_agent\scheduler\daily_update.ps1

# Or test the scheduled task
schtasks /run /tn "Vasudha Market Update"
```

## How It Works

### Daily Process (6 PM)

1. **Check Database** - Gets latest date in your DB (e.g., 2026-01-25)
2. **Download Latest** - Downloads current year CSV from Kaggle (~2-5 MB)
3. **Incremental Insert** - Only inserts records newer than your latest date
4. **Rebuild Persistence** - Updates forecasting tables (takes ~10-15 minutes)
5. **Log Everything** - Logs are saved to `logs/` directory
6. **Cleanup** - Removes temporary files

### Smart Features

- **Skips unnecessary updates** - If data is already current
- **Incremental processing** - Only new records (typically 2000-5000/day)
- **Error handling** - Logs errors and fails gracefully
- **Dry run mode** - Preview what would be updated
- **Force mode** - Override currency checks

## Monitoring

Check logs to see what happened:
```powershell
# View today's update log
Get-Content C:\vasudha-project\backend\agents\market_agent\logs\market_update_20260130.log -Tail 50

# View scheduler log
Get-Content C:\vasudha-project\backend\agents\market_agent\logs\scheduler.log -Tail 20
```

## Manual Commands

```powershell
cd C:\vasudha-project\backend\agents\market_agent
.\venv\Scripts\Activate.ps1

# Preview what would be updated
python update_market_db.py --dry-run

# Force update even if data seems current
python update_market_db.py --force

# Normal update (checks if needed first)
python update_market_db.py
```

## Troubleshooting

**If Kaggle download fails:**
- Check `kaggle.json` is in `C:\Users\pursw\.kaggle\`
- Test: `kaggle datasets list` should work

**If Task Scheduler fails:**
- Check the task exists: Task Scheduler → Task Scheduler Library
- View task history for error details
- Check logs in `C:\vasudha-project\backend\agents\market_agent\logs\`

**If update script fails:**
- Check virtual environment is set up correctly
- Ensure database file exists and is writable
- Check network connectivity

## Expected Output

```
2026-01-30 18:00:01 - Starting Market Agent Daily Update
2026-01-30 18:00:02 - Latest data in DB: 2026-01-25
2026-01-30 18:00:03 - Downloading latest market data from Kaggle...
2026-01-30 18:00:15 - Found data file: 2026.csv  
2026-01-30 18:00:16 - New records available: 3,247
2026-01-30 18:00:17 - Starting incremental ingestion...
2026-01-30 18:00:32 - Processed chunk: 3,247 rows, inserted: 3,247
2026-01-30 18:00:33 - Rebuilding persistence tables for forecasting...
2026-01-30 18:12:45 - ✅ All persistence tables rebuilt successfully!
2026-01-30 18:12:46 - UPDATE COMPLETED: 3,247 records added in 12.7 minutes
```

The system will now automatically keep your market data current! 🎯
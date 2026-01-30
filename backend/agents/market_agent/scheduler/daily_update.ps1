# Market Agent Daily Update - Task Scheduler Setup
# ==================================================

## OPTION 1: PowerShell Script (Recommended)

# Save this as: daily_update.ps1
# Then create a Task Scheduler task that runs this script

# Set error handling
$ErrorActionPreference = "Stop"

# Log file path
$LogPath = "C:\vasudha-project\backend\agents\market_agent\logs\scheduler.log"

# Create log directory if it doesn't exist
New-Item -Path (Split-Path $LogPath) -ItemType Directory -Force -ErrorAction SilentlyContinue

# Function to write timestamped log messages
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    Write-Output $logMessage
    Add-Content -Path $LogPath -Value $logMessage
}

try {
    Write-Log "Starting Market Agent Daily Update"
    
    # Change to market agent directory
    Set-Location "C:\vasudha-project\backend\agents\market_agent"
    Write-Log "Changed to market agent directory"
    
    # Activate virtual environment
    & ".\venv\Scripts\Activate.ps1"
    Write-Log "Virtual environment activated"
    
    # Run the update script
    Write-Log "Executing update_market_db.py..."
    python update_market_db.py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Market update completed successfully"
    } else {
        Write-Log "Market update failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    
} catch {
    Write-Log "Error occurred: $($_.Exception.Message)"
    Write-Log "Full error: $($_ | Out-String)"
    exit 1
} finally {
    Write-Log "Daily update script finished"
}
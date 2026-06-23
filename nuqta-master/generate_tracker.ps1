$rootPath = "c:\Users\user\OneDrive\Desktop\rez\rez-frontend"
$outputPath = "C:\Users\user\.gemini\antigravity\brain\fbc70646-8325-46e0-a2c0-ebea6741ff05\console_log_tracker.md"

$files = Get-ChildItem -Path $rootPath -Recurse -Include *.ts, *.tsx, *.js | 
Where-Object { $_.FullName -notmatch "node_modules|coverage|\.expo|\.git|dist|build|test-results|web-shims" }

$content = @()
$content += "# Console Log Tracker (rez-frontend)"
$content += ""
$content += "This document tracks ``console.log`` statements identified in the ``rez-frontend`` codebase."
$content += ""
$content += "## Source Code"
$content += ""

foreach ($file in $files) {
    if ($file.FullName -match "generate_tracker.ps1") { continue }

    $relativePath = $file.FullName.Substring($rootPath.Length + 1).Replace("\", "/")
    
    $lines = Select-String -Path $file.FullName -Pattern "console.log"
    
    if ($lines) {
        $content += "### $relativePath"
        foreach ($line in $lines) {
            $cleanLine = $line.Line.Trim()
            # Escape backticks if any
            $cleanLine = $cleanLine.Replace("``", "'")
            
            # Group by file
            $entry = "- [ ] Line " + $line.LineNumber + ": ``" + $cleanLine + "``"
            $content += $entry
        }
        $content += "" # Empty line between files
    }
}

$content | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "Tracker generated with $($content.Count) lines."

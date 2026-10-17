param([Parameter(Mandatory=$true)][string]$Output, [int]$Seconds=600)
$timer=[Diagnostics.Stopwatch]::StartNew()
$writer=[IO.StreamWriter]::new($Output,$false,[Text.UTF8Encoding]::new($false))
try {
  while($timer.Elapsed.TotalSeconds -lt $Seconds) {
    $cpu=Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
    $memory=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory
    $writer.WriteLine(([ordered]@{
      utc=[DateTime]::UtcNow.ToString('o');cpuPercent=$cpu.PercentProcessorTime;
      availableMB=$memory.AvailableMBytes;pagesInputPerSecond=$memory.PagesInputPersec
    }|ConvertTo-Json -Compress))
    $writer.Flush()
    Start-Sleep -Milliseconds 1000
  }
} finally { $writer.Dispose() }

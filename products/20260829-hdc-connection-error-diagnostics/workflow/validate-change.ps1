param(
    [Parameter(Mandatory=$true)]
    [string]$ChangeDir
)

$ErrorActionPreference = "Stop"

function Fail($message) {
    Write-Error $message
    exit 1
}

function ReadText($path) {
    if (-not (Test-Path -LiteralPath $path)) {
        Fail "Missing required file: $path"
    }
    return Get-Content -LiteralPath $path -Raw
}

function NormalizeCell($value) {
    if ($null -eq $value) {
        return ""
    }
    return $value.ToString().Trim().Trim('`').Trim()
}

function GetIds($text, $prefix) {
    if ([string]::IsNullOrWhiteSpace($text)) {
        return @()
    }
    $escapedPrefix = [regex]::Escape($prefix)
    $pattern = "(?<![A-Z0-9])$escapedPrefix-\d{3,}(?!\d)"
    return @([regex]::Matches($text, $pattern) | ForEach-Object { $_.Value } | Sort-Object -Unique)
}

function SplitMarkdownRow($line) {
    $trimmed = $line.Trim()
    if (-not ($trimmed.StartsWith("|") -and $trimmed.EndsWith("|"))) {
        return @()
    }
    $inner = $trimmed.Trim("|")
    return @($inner -split "\|" | ForEach-Object { NormalizeCell $_ })
}

function IsSeparatorRow($cells) {
    if ($cells.Count -eq 0) {
        return $false
    }
    foreach ($cell in $cells) {
        if ($cell -notmatch "^:?-{3,}:?$") {
            return $false
        }
    }
    return $true
}

function GetMarkdownTableRows($text, [string[]]$requiredHeaders) {
    $lines = @($text -split "`r?`n")
    $rows = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $headers = @(SplitMarkdownRow $lines[$i])
        if ($headers.Count -eq 0) {
            continue
        }
        $hasRequiredHeaders = $true
        foreach ($header in $requiredHeaders) {
            if ($headers -notcontains $header) {
                $hasRequiredHeaders = $false
                break
            }
        }
        if (-not $hasRequiredHeaders) {
            continue
        }
        $j = $i + 1
        if ($j -lt $lines.Count) {
            $separator = @(SplitMarkdownRow $lines[$j])
            if (IsSeparatorRow $separator) {
                $j++
            }
        }
        while ($j -lt $lines.Count) {
            $cells = @(SplitMarkdownRow $lines[$j])
            if ($cells.Count -eq 0) {
                break
            }
            if (IsSeparatorRow $cells) {
                $j++
                continue
            }
            $row = @{}
            for ($column = 0; $column -lt $headers.Count; $column++) {
                $value = ""
                if ($column -lt $cells.Count) {
                    $value = $cells[$column]
                }
                $row[$headers[$column]] = $value
            }
            $rows += [pscustomobject]$row
            $j++
        }
        $i = $j - 1
    }
    return @($rows)
}

function GetPairKey($feature, $caseId) {
    return "$feature -> $caseId"
}

function GetDeclaredTaskIds($body, $labelPattern, $prefix) {
    $ids = @()
    foreach ($line in @($body -split "`r?`n")) {
        if ($line -match "^\s*-\s*$labelPattern\s*:\s*(.+)$") {
            $ids += @(GetIds $Matches[1] $prefix)
        }
    }
    return @($ids | Sort-Object -Unique)
}

function GetFeatureTestPairsFromRows($rows) {
    $pairs = @()
    foreach ($row in $rows) {
        $features = @(GetIds $row.'Feature ID' "F")
        $cases = @(GetIds $row.'Test Case ID' "TC")
        foreach ($feature in $features) {
            foreach ($caseId in $cases) {
                $pairs += [pscustomobject]@{
                    Feature = $feature
                    CaseId = $caseId
                    Key = GetPairKey $feature $caseId
                }
            }
        }
    }
    return @($pairs)
}

function GetTaskEntries($text) {
    $lines = @($text -split "`r?`n")
    $tasks = @()
    $currentTaskId = $null
    $currentBody = @()
    foreach ($line in $lines) {
        if ($line -match "^###\s+(TASK-\d{3,})\b") {
            if ($null -ne $currentTaskId) {
                $body = $currentBody -join "`n"
                $tasks += [pscustomobject]@{
                    TaskId = $currentTaskId
                    Features = @(GetDeclaredTaskIds $body "Feature IDs?" "F")
                    Cases = @(GetDeclaredTaskIds $body "Test Case IDs?" "TC")
                }
            }
            $currentTaskId = $Matches[1]
            $currentBody = @($line)
            continue
        }
        if ($null -ne $currentTaskId) {
            $currentBody += $line
        }
    }
    if ($null -ne $currentTaskId) {
        $body = $currentBody -join "`n"
        $tasks += [pscustomobject]@{
            TaskId = $currentTaskId
            Features = @(GetDeclaredTaskIds $body "Feature IDs?" "F")
            Cases = @(GetDeclaredTaskIds $body "Test Case IDs?" "TC")
        }
    }
    return @($tasks)
}

function HasTaskPair($tasks, $feature, $caseId) {
    foreach ($task in $tasks) {
        if (($task.Features -contains $feature) -and ($task.Cases -contains $caseId)) {
            return $true
        }
    }
    return $false
}

function IsPassResult($result) {
    $normalized = NormalizeCell $result
    $passedChinese = -join ([char]0x901A, [char]0x8FC7)
    return (($normalized -match "(?i)^(pass|passed)$") -or ($normalized -eq $passedChinese))
}

function IsMeaningfulExceptionValue($value) {
    $normalized = NormalizeCell $value
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        return $false
    }
    $noChinese = -join ([char]0x65E0)
    $unconfirmedChinese = -join ([char]0x672A, [char]0x786E, [char]0x8BA4)
    if (($normalized -eq $noChinese) -or ($normalized -eq $unconfirmedChinese)) {
        return $false
    }
    return $normalized -notmatch "(?i)^(n/a|na|none|no|pending)$"
}

function HasPassingReportPair($reportRows, $feature, $caseId) {
    foreach ($row in $reportRows) {
        $features = @(GetIds $row.'Feature ID' "F")
        $cases = @(GetIds $row.'Test Case ID' "TC")
        if (($features -contains $feature) -and ($cases -contains $caseId) -and (IsPassResult $row.Result)) {
            return $true
        }
    }
    return $false
}

function HasAcceptedExceptionPair($exceptionRows, $feature, $caseId) {
    foreach ($row in $exceptionRows) {
        $features = @(GetIds $row.'Feature ID' "F")
        $cases = @(GetIds $row.'Test Case ID' "TC")
        if (($features -contains $feature) -and ($cases -contains $caseId)) {
            if ((IsMeaningfulExceptionValue $row.Blocker) -and (IsMeaningfulExceptionValue $row.'User Confirmation')) {
                return $true
            }
        }
    }
    return $false
}

$resolved = Resolve-Path -LiteralPath $ChangeDir -ErrorAction SilentlyContinue
if (-not $resolved) {
    Fail "Change directory does not exist: $ChangeDir"
}
$dir = $resolved.Path
$requiredFiles = @(
    "todo.md",
    "clarification.md",
    "requirement-spec.md",
    "architecture.md",
    "test-cases.md",
    "feature-test-matrix.md",
    "tasks.md",
    "apply-report.md"
)
foreach ($file in $requiredFiles) {
    $path = Join-Path $dir $file
    if (-not (Test-Path -LiteralPath $path)) {
        Fail "Missing required file: $file"
    }
}

$specText = ReadText (Join-Path $dir "requirement-spec.md")
$matrixText = ReadText (Join-Path $dir "feature-test-matrix.md")
$casesText = ReadText (Join-Path $dir "test-cases.md")
$tasksText = ReadText (Join-Path $dir "tasks.md")
$reportText = ReadText (Join-Path $dir "apply-report.md")
$features = @(GetIds $specText "F")
if ($features.Count -eq 0) {
    Fail "No feature IDs found in requirement-spec.md. Expected F-001 style IDs."
}
$definedCases = @(GetIds $casesText "TC")
$matrixRows = @(GetMarkdownTableRows $matrixText @("Feature ID", "Test Case ID"))
if ($matrixRows.Count -eq 0) {
    Fail "No feature-test mapping rows found in feature-test-matrix.md."
}
$matrixPairs = @(GetFeatureTestPairsFromRows $matrixRows)
if ($matrixPairs.Count -eq 0) {
    Fail "No F-xxx -> TC-xxx pairs found in feature-test-matrix.md."
}

$missingMatrix = @()
$unknownMatrixFeatures = @()
$missingCases = @()
foreach ($feature in $features) {
    if (-not ($matrixPairs | Where-Object { $_.Feature -eq $feature })) {
        $missingMatrix += $feature
    }
}
foreach ($pair in $matrixPairs) {
    if ($features -notcontains $pair.Feature) {
        $unknownMatrixFeatures += $pair.Feature
    }
    if ($definedCases -notcontains $pair.CaseId) {
        $missingCases += $pair.CaseId
    }
}

$tasks = @(GetTaskEntries $tasksText)
if ($tasks.Count -eq 0) {
    Fail "No TASK-xxx entries found in tasks.md."
}
$invalidTasks = @()
foreach ($task in $tasks) {
    if (($task.Features.Count -eq 0) -or ($task.Cases.Count -eq 0)) {
        $invalidTasks += $task.TaskId
    }
}
$missingTaskPairs = @()
foreach ($pair in $matrixPairs) {
    if (-not (HasTaskPair $tasks $pair.Feature $pair.CaseId)) {
        $missingTaskPairs += $pair.Key
    }
}

$reportRows = @(GetMarkdownTableRows $reportText @("Feature ID", "Test Case ID", "Result"))
$exceptionRows = @(GetMarkdownTableRows $reportText @("Feature ID", "Test Case ID", "Blocker", "User Confirmation"))
$missingReportPairs = @()
foreach ($pair in $matrixPairs) {
    $hasPassingResult = HasPassingReportPair $reportRows $pair.Feature $pair.CaseId
    $hasAcceptedException = HasAcceptedExceptionPair $exceptionRows $pair.Feature $pair.CaseId
    if (-not ($hasPassingResult -or $hasAcceptedException)) {
        $missingReportPairs += $pair.Key
    }
}

if ($missingMatrix.Count -gt 0) {
    Fail ("Features without test-case mapping: " + (($missingMatrix | Sort-Object -Unique) -join ", "))
}
if ($unknownMatrixFeatures.Count -gt 0) {
    Fail ("Matrix references undefined features: " + (($unknownMatrixFeatures | Sort-Object -Unique) -join ", "))
}
if ($missingCases.Count -gt 0) {
    Fail ("Matrix references undefined test cases: " + (($missingCases | Sort-Object -Unique) -join ", "))
}
if ($invalidTasks.Count -gt 0) {
    Fail ("Tasks missing feature or test references: " + (($invalidTasks | Sort-Object -Unique) -join ", "))
}
if ($missingTaskPairs.Count -gt 0) {
    Fail ("Tasks missing feature-test pairs: " + (($missingTaskPairs | Sort-Object -Unique) -join ", "))
}
if ($missingReportPairs.Count -gt 0) {
    Fail ("Apply report missing passing result or accepted exception for pairs: " + (($missingReportPairs | Sort-Object -Unique) -join ", "))
}

$featureList = $features | Sort-Object -Unique
$pairList = $matrixPairs | ForEach-Object { $_.Key } | Sort-Object -Unique
Write-Host "Validation passed."
Write-Host ("Features covered: " + ($featureList -join ", "))
Write-Host ("Feature-test pairs verified: " + ($pairList -join ", "))

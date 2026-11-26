#Requires -Version 5.1
<#
.SYNOPSIS
    Injects the social media footer block into the six An Artist's Touch HTML pages.

.SAFEGUARDS
    1. Detects and preserves original UTF-8 BOM status per file.
    2. Detects and preserves original line ending style (CRLF vs LF) per file.
    3. Skips any file that already contains .footer-social (idempotent).
    4. Locates the <small> copyright marker with a trim-based search that
       tolerates harmless leading/trailing whitespace differences.
    5. Aborts modification of a file if the marker is missing or appears
       more than once (ambiguous).
    6. After writing, reads the file back from disk and verifies:
         a. Exactly one .footer-social section is present.
         b. All four social URLs are present.
         c. .footer-social appears before <small> in the document.
    7. Reports SUCCESS only after all six verifications pass.
    8. If every file succeeds, removes this script from the project.
       If any file fails, the script is kept for diagnosis.
    9. Only the six specified HTML files are ever modified.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root  = "g:\عمل ودراسة\برمجة\OUSOS\Graduation projects\An Artist's Touch"
$files = @('index.html','about.html','artworks.html','gallery.html','journey.html','contact.html')

# ── URLs that must be present after injection ─────────────────────────────────
$requiredUrls = @(
    'https://www.facebook.com/share/18aYC3Nmee/',
    'https://wa.me/qr/3FQBDTVDXOMXF1',
    'https://www.instagram.com/emadabotafsh/',
    'https://www.threads.com/@emadabotafsh'
)

# ── Social block content (platform-neutral indentation; line endings applied
#    per-file at write time) ───────────────────────────────────────────────────
$socialLines = @(
    '        <!-- Social media links -->',
    '        <div class="footer-social">',
    '          <span class="footer-social__label" data-i18n="footer.social.label">تابعني على</span>',
    '          <div class="footer-social__links">',
    '',
    '            <!-- Facebook -->',
    '            <a class="footer-social__link"',
    '               href="https://www.facebook.com/share/18aYC3Nmee/"',
    '               target="_blank"',
    '               rel="noopener noreferrer"',
    '               data-i18n-aria="footer.social.facebook"',
    '               aria-label="فيسبوك">',
    '              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>',
    '              </svg>',
    '            </a>',
    '',
    '            <!-- WhatsApp -->',
    '            <a class="footer-social__link"',
    '               href="https://wa.me/qr/3FQBDTVDXOMXF1"',
    '               target="_blank"',
    '               rel="noopener noreferrer"',
    '               data-i18n-aria="footer.social.whatsapp"',
    '               aria-label="واتساب">',
    '              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
    '              </svg>',
    '            </a>',
    '',
    '            <!-- Instagram -->',
    '            <a class="footer-social__link"',
    '               href="https://www.instagram.com/emadabotafsh/"',
    '               target="_blank"',
    '               rel="noopener noreferrer"',
    '               data-i18n-aria="footer.social.instagram"',
    '               aria-label="إنستغرام">',
    '              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
    '              </svg>',
    '            </a>',
    '',
    '            <!-- Threads -->',
    '            <a class="footer-social__link"',
    '               href="https://www.threads.com/@emadabotafsh"',
    '               target="_blank"',
    '               rel="noopener noreferrer"',
    '               data-i18n-aria="footer.social.threads"',
    '               aria-label="ثريدز">',
    '              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.642-2.05 1.07-1.187 1.637-2.966 1.698-5.284-.49.044-.997.063-1.517.063-3.233 0-5.783-.862-7.584-2.56-1.712-1.613-2.645-3.837-2.645-6.263 0-2.498.933-4.635 2.633-6.015C11.63 1.188 13.372.75 15.21.75c2.142 0 3.878.57 5.16 1.694 1.459 1.277 2.21 3.238 2.21 5.837 0 .88-.061 1.73-.186 2.546.517.19 1.012.408 1.48.651l-.022.044c.258-1.049.388-2.153.388-3.263 0-3.157-.996-5.633-2.882-7.167C19.496.86 17.317.02 14.812 0h-.012C11.633.02 9.097 1.028 7.273 2.955c-1.86 1.967-2.838 4.738-2.838 8.025v.025c.001 3.286.978 6.058 2.838 8.025 1.824 1.927 4.36 2.935 7.527 2.955h.012c2.505-.02 4.683-.86 6.546-2.492v.001l.013-.011c1.852-1.527 2.84-3.937 2.84-6.98 0-.302-.01-.598-.03-.888-.467.249-.955.47-1.46.661.016.144.023.3.023.457 0 2.47-.753 4.329-2.237 5.541-.949.788-2.207 1.33-3.747 1.617.07-.316.107-.64.107-.972 0-3.067-2.49-5.556-5.556-5.556-3.067 0-5.557 2.489-5.557 5.556 0 3.066 2.49 5.556 5.557 5.556.456 0 .9-.056 1.325-.16z"/>',
    '              </svg>',
    '            </a>',
    '',
    '          </div>',
    '        </div>',
    ''   # blank line before <small>
)

# ── Helper: detect UTF-8 BOM ──────────────────────────────────────────────────
function Test-BOM {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    return ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
}

# ── Helper: detect dominant line ending ──────────────────────────────────────
function Get-LineEnding {
    param([string]$Content)
    $crlfCount = ([regex]::Matches($Content, '\r\n')).Count
    $lfCount   = ([regex]::Matches($Content, '(?<!\r)\n')).Count
    if ($crlfCount -ge $lfCount) { return "`r`n" } else { return "`n" }
}

# ── Process each file ─────────────────────────────────────────────────────────
$results    = @{}
$allPassed  = $true

foreach ($filename in $files) {
    $path = Join-Path $root $filename
    Write-Host "`n--- $filename ---"

    # Safeguard: only touch the six listed files
    if ($filename -notin $files) {
        Write-Host "  SKIPPED - not in allowed file list"
        continue
    }

    # Read raw bytes to preserve BOM and detect encoding
    $rawBytes   = [System.IO.File]::ReadAllBytes($path)
    $hasBOM     = ($rawBytes.Length -ge 3 -and $rawBytes[0] -eq 0xEF -and
                   $rawBytes[1] -eq 0xBB -and $rawBytes[2] -eq 0xBF)
    $enc        = [System.Text.UTF8Encoding]::new($false)  # no-BOM encoder
    $content    = $enc.GetString($rawBytes)
    # Strip BOM character if present so string operations are clean
    if ($hasBOM -and $content.StartsWith([char]0xFEFF)) {
        $content = $content.Substring(1)
    }

    # Detect line ending style
    $le = Get-LineEnding -Content $content

    # Safeguard 3: check for existing social section
    if ($content -match 'footer-social') {
        Write-Host "  SKIPPED - .footer-social already exists"
        $results[$filename] = 'SKIPPED - already exists'
        continue
    }

    # Safeguard 4: locate <small> marker with whitespace tolerance
    # Split into lines, find lines whose trimmed content is '<small>'
    $lines      = $content -split '(?<=\r?\n)'  # split but keep endings
    $markerIdx  = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq '<small>') {
            $markerIdx += $i
        }
    }

    if ($markerIdx.Count -eq 0) {
        Write-Host "  ERROR - <small> marker not found. File not modified."
        $results[$filename] = 'ERROR - marker not found'
        $allPassed = $false
        continue
    }
    if ($markerIdx.Count -gt 1) {
        Write-Host "  ERROR - <small> marker is ambiguous ($($markerIdx.Count) occurrences). File not modified."
        $results[$filename] = "ERROR - marker ambiguous ($($markerIdx.Count) occurrences)"
        $allPassed = $false
        continue
    }

    $insertAt = $markerIdx[0]  # line index before which to insert

    # Build the social block lines using the file's own line ending
    $blockLines = $socialLines | ForEach-Object { $_ + $le }

    # Reconstruct: lines before marker + social block + marker onward
    $newLines   = $lines[0..($insertAt - 1)] + $blockLines + $lines[$insertAt..($lines.Count - 1)]
    $newContent = $newLines -join ''

    # Re-attach BOM if original had one
    if ($hasBOM) {
        $bomBytes     = [byte[]](0xEF, 0xBB, 0xBF)
        $contentBytes = $enc.GetBytes($newContent)
        $outBytes     = $bomBytes + $contentBytes
    } else {
        $outBytes = $enc.GetBytes($newContent)
    }

    [System.IO.File]::WriteAllBytes($path, $outBytes)
    Write-Host "  Written."

    # ── Verification pass ─────────────────────────────────────────────────
    $verify = $enc.GetString([System.IO.File]::ReadAllBytes($path))
    if ($hasBOM -and $verify.StartsWith([char]0xFEFF)) { $verify = $verify.Substring(1) }

    $vErrors = @()

    # (a) Exactly one .footer-social
    $socialCount = ([regex]::Matches($verify, 'class="footer-social"')).Count
    if ($socialCount -ne 1) {
        $vErrors += "footer-social count = $socialCount (expected 1)"
    }

    # (b) All four URLs present
    foreach ($url in $requiredUrls) {
        if (-not $verify.Contains($url)) {
            $vErrors += "Missing URL: $url"
        }
    }

    # (c) .footer-social appears before <small>
    $socialPos = $verify.IndexOf('class="footer-social"')
    $smallPos  = $verify.IndexOf('<small>')
    if ($socialPos -lt 0 -or $smallPos -lt 0 -or $socialPos -gt $smallPos) {
        $vErrors += "footer-social does not appear before <small>"
    }

    if ($vErrors.Count -gt 0) {
        Write-Host "  VERIFICATION FAILED:"
        $vErrors | ForEach-Object { Write-Host "    - $_" }
        $results[$filename] = "FAILED: $($vErrors -join '; ')"
        $allPassed = $false
    } else {
        Write-Host "  VERIFIED OK"
        $results[$filename] = 'SUCCESS'
    }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n========== SUMMARY =========="
foreach ($f in $files) {
    if ($results.ContainsKey($f)) {
        Write-Host "  $f : $($results[$f])"
    } else {
        Write-Host "  $f : (not processed)"
    }
}

# ── Self-removal only after all verifications pass ────────────────────────────
if ($allPassed) {
    Write-Host "`nAll files verified. Removing injection script..."
    Remove-Item -Path (Join-Path $root '_inject_social.ps1') -Force
    Write-Host "Script removed."
} else {
    Write-Host "`nOne or more files failed. Script kept for diagnosis."
}

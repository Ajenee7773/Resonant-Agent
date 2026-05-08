---
name: resonant-os
description: Detect the local operating system, shell, paths, and common package managers before doing OS-specific work.
triggers:
  - os
  - operating system
  - shell
  - install
  - package manager
  - path
  - environment
---

# RESONANT OS Detection

Use this skill when you need to know what computer you are running on.

Do not guess the OS. Detect it.

## Quick Detection Command

Run this first if Node.js is available:

```bash
node -e "const os=require('os'),p=require('path'),cp=require('child_process'); const has=c=>{try{cp.execSync((process.platform==='win32'?'where ':'command -v ')+c,{stdio:'ignore'});return true}catch{return false}}; console.log(JSON.stringify({platform:process.platform,type:os.type(),release:os.release(),arch:os.arch(),homedir:os.homedir(),cwd:process.cwd(),shell:process.env.SHELL||process.env.ComSpec||'',pathSeparator:p.sep,tools:{node:has('node'),npm:has('npm'),git:has('git'),python:has('python')||has('python3'),pip:has('pip')||has('pip3'),curl:has('curl'),powershell:has('powershell')||has('pwsh'),brew:has('brew'),apt:has('apt'),winget:has('winget'),choco:has('choco'),ollama:has('ollama')}},null,2))"
```

If Node.js is not available, use the native checks below.

## Windows

Typical shell:

- PowerShell
- Command Prompt
- Git Bash if installed

Useful checks:

```powershell
$PSVersionTable
[System.Environment]::OSVersion
$HOME
Get-Command node,npm,git,python,pip,curl,winget,choco,ollama -ErrorAction SilentlyContinue
```

Common paths:

```text
C:\Users\<name>\.resonant\
C:\Users\<name>\.resonant\agent\
C:\Users\<name>\.resonant\workspace\
C:\Users\<name>\.resonant\agent\skills\
```

Package managers:

- `winget`
- `choco`
- `npm`
- `pip`

Path notes:

- Prefer PowerShell for automation.
- Quote paths with spaces.
- Use `-LiteralPath` when manipulating exact file paths.

## macOS

Typical shell:

- zsh
- bash

Useful checks:

```bash
sw_vers
uname -a
echo "$SHELL"
command -v node npm git python3 pip3 curl brew ollama
```

Common paths:

```text
~/.resonant/
~/.resonant/agent/
~/.resonant/workspace/
~/.resonant/agent/skills/
```

Package managers:

- `brew`
- `npm`
- `pip3`

## Linux

Typical shell:

- bash
- zsh

Useful checks:

```bash
cat /etc/os-release 2>/dev/null || true
uname -a
echo "$SHELL"
command -v node npm git python3 pip3 curl apt dnf pacman yay ollama
```

Common paths:

```text
~/.resonant/
~/.resonant/agent/
~/.resonant/workspace/
~/.resonant/agent/skills/
```

Package managers vary:

- Debian/Ubuntu: `apt`
- Fedora/RHEL: `dnf`
- Arch: `pacman` or `yay`
- JavaScript: `npm`
- Python: `pip3`

## Operating Rule

When writing scripts, match the user's OS and shell.

When you are unsure, inspect first.

When you create a reusable OS-specific helper, document:

- OS,
- shell,
- dependencies,
- install command,
- run command,
- stop/disable command, if the operator asks for one.

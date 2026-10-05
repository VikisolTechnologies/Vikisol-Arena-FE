# INFRA-1: the home server for Arena (Windows 11 + WSL2 + Docker), 5 Oct 2026
**From the architect. The reader is a Claude Code session running ON the new PC** (RTX 5060 8 GB, 16 GB RAM, 1 TB SSD, Windows 11). The founder (Syam) is not an engineer, so explain each manual step in plain words.

## Goal
`api-arena.vikisol.in` is served from this PC (the Arena backend, Postgres and Redis in Docker), reachable through a Cloudflare Tunnel, with backups, auto-start and monitoring. The frontend stays on Vercel. JennySol and the local AI models come later (INFRA-2).

## Hard rules
- **The founder does** every password, account login, DNS change and Cloudflare/Vercel click. You prepare, tell him exactly what to click, and wait.
  - Never ask him to paste a secret into the chat.
  - Secrets go only into `C:\arena\secrets\.env`, or the WSL path you choose. That file is never committed and never printed.
- **Never touch Railway, HRLMS / Vikisol One, or any DNS record yourself.**
- **No inbound ports opened on the router.** The only way in is the Cloudflare Tunnel.
- Work in `~/arena` inside WSL (Ubuntu 24.04). Keep everything reproducible in a new private repo folder `infra/` (compose files, scripts, README). No secrets in it.
- Stop and report if any step would delete data, or if you're unsure.

## Step 1: check the machine (read-only)
Report:
- the Windows edition and version;
- virtualization enabled;
- the NVIDIA driver version;
- the WSL version, and that Ubuntu-24.04 is installed;
- Docker Desktop running with the WSL2 backend;
- `nvidia-smi` works inside WSL;
- free disk and RAM;
- wired or Wi-Fi network;
- the public upload speed.

List anything missing, for the founder to install.

## Step 2: make Windows behave like a server (tell the founder what to click; verify afterwards)
- **Power:** never sleep or hibernate; the lid and power button do nothing; the disk never turns off.
- **BIOS:** "restore on AC power loss = power on" (the founder does this).
- **Windows Update:** active hours set wide; restart only at 04:00–05:00.
- **Docker Desktop:** start on sign-in; WSL integration on.
- **`.wslconfig`:** memory 10 GB, swap 8 GB, so Windows keeps headroom.
- **Auto-start after a reboot:** a Task Scheduler task, at startup (not at logon), that starts WSL and `docker compose up -d`. Prove it by rebooting once.
- **Disk encryption:** BitLocker (Pro) or Device Encryption (Home). The founder turns it on and stores the recovery key himself.
- **Windows Firewall:** on, with no new inbound rules.

## Step 3: the stack (`infra/docker-compose.yml`)
Services, all with `restart: unless-stopped`, healthchecks, named volumes and a private Docker network:
- `postgres:16`: data on a named volume; tuned for 16 GB RAM (`shared_buffers` 1 GB); **not** published to the host network.
- `redis:7`: password-protected, not published.
- `arena-api`: built from `Vikisol-Arena-BE` `main` (its Dockerfile); `JAVA_OPTS` from the image; memory limit 1.5 GB; env from the secrets file; `SEED_ENABLED=false`; profile **not** `local`; published only to `127.0.0.1:8081`.
- `cloudflared`: a tunnel to `http://arena-api:8081`.

Env var **names** come from `Vikisol-Arena-BE/docs/DEPLOY-CHECKLIST.md`. Generate strong random values for the secrets the server owns (DB password, Redis password, JWT secret, file-signing secret) directly into the secrets file, without displaying them. The founder supplies third-party keys (Cloudinary, mail, Google) by typing them into the file himself.

## Step 4: Cloudflare Tunnel (the founder clicks; you guide)
- The founder creates or uses a Cloudflare account, and confirms where the `vikisol.in` DNS is managed. **If it's not on Cloudflare, stop and report the options. Don't move DNS.**
- Create the tunnel `arena-home`, with the public hostname `api-arena.vikisol.in` → `http://arena-api:8081`. **The DNS switch happens only when the architect says "go live".** Until then, test on a temporary hostname such as `api-home.vikisol.in`.
- Verify from outside that `https://api-home.vikisol.in/api/v1/actuator/health` returns UP.

## Step 5: backups (before any real user)
- A nightly `pg_dump` at 02:30: compressed, **encrypted** (age or gpg; the founder keeps the key off this machine), kept 14 days locally, and copied off-site (Cloudflare R2 or Backblaze B2; the founder creates the bucket and types the key into the secrets file).
- Uploaded media: if Cloudinary is used, nothing to do; if local, include it in the backup.
- **Prove a restore:** restore last night's dump into a scratch database and count the rows. Write up the result. An untested backup doesn't count.

## Step 6: monitoring and operations
- An external uptime check on the health URL (UptimeRobot free tier; the founder creates it), alerting his phone or email.
- A local `healthcheck.ps1` or shell script, every 5 minutes: if the API or the tunnel is down, restart the container and log it.
- Log rotation for the Docker logs (max 50 MB × 5).
- Disk-space alert at 80%.
- `infra/README.md`, in plain words: how to start, stop, update, see logs, restore, and what to do after a power cut.

## Step 7: deploy script
`infra/deploy.sh`:
1. `git pull` on `main`;
2. build the image, tagged with the commit;
3. take a pre-deploy dump;
4. `docker compose up -d`;
5. wait for health;
6. print `/version`;
7. on failure, roll back to the previous image tag.

No auto-deploy on push; the founder runs it after the architect says "release-ready".

## Step 8: report
Write `infra/REPORT.md`: what's installed, what the founder still has to do (a list with exact clicks), the test results (health from outside, the reboot test, the restore test), and the open risks.

## Not in this mission (INFRA-2, later)
JennySol services, Ollama with GPU models (8 GB VRAM: small models only), Tailscale for remote admin, a second disk.

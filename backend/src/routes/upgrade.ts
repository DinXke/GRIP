/**
 * Upgrade API — admin kan de app updaten vanuit de UI
 * Werkt zowel bare-metal (via upgrade.sh) als Docker (via git pull + rebuild op host)
 */
import { FastifyInstance } from 'fastify'
import { execFile, spawn, exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { requireAuth } from '../middleware/auth'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const APP_DIR = process.env.APP_DIR ?? '/opt/adhd'
const UPGRADE_SCRIPT = `${APP_DIR}/scripts/upgrade.sh`
const RESULT_FILE = `${APP_DIR}/.upgrade-result`
const VERSION_FILE = `${APP_DIR}/.version`
const COMPOSE_FILE = `${APP_DIR}/docker-compose.yml`

// Detect mode: bare-metal (upgrade.sh exists) or Docker
const isDocker = !existsSync(UPGRADE_SCRIPT) && existsSync('/.dockerenv')

async function requireAdmin(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Niet ingelogd' })
  }
  if (request.user?.role !== 'admin') {
    return reply.status(403).send({ error: 'Alleen admins' })
  }
}

export async function upgradeRoutes(fastify: FastifyInstance) {

  // ── GET /api/admin/system/version ─────────────────────────────
  fastify.get('/api/admin/system/version', { preHandler: requireAdmin }, async () => {
    let version = 'v1.3.0'
    try { version = readFileSync(VERSION_FILE, 'utf8').trim() } catch {}

    // Try git for more info
    let gitSha = ''
    try {
      const { stdout } = await execAsync(`git -C ${APP_DIR} rev-parse --short HEAD 2>/dev/null`)
      gitSha = stdout.trim()
    } catch {}

    return {
      version: gitSha ? `${version} (${gitSha})` : version,
      uptime: Math.floor(process.uptime()),
      mode: isDocker ? 'docker' : 'bare-metal',
    }
  })

  // ── GET /api/admin/system/update-check ───────────────────────
  fastify.get('/api/admin/system/update-check', { preHandler: requireAdmin }, async (_, reply) => {
    // Try git directly (works if APP_DIR is mounted)
    try {
      await execAsync(`git -C ${APP_DIR} fetch origin main --quiet`, { timeout: 15000 })
      const { stdout: localSha } = await execAsync(`git -C ${APP_DIR} rev-parse HEAD`)
      const { stdout: remoteSha } = await execAsync(`git -C ${APP_DIR} rev-parse origin/main`)

      if (localSha.trim() === remoteSha.trim()) {
        return { update_available: false, current_sha: localSha.trim().slice(0, 8) }
      }

      const { stdout: changelog } = await execAsync(
        `git -C ${APP_DIR} log --oneline ${localSha.trim()}..origin/main 2>/dev/null | head -15`
      )

      return {
        update_available: true,
        current_sha: localSha.trim().slice(0, 8),
        latest_sha: remoteSha.trim().slice(0, 8),
        changes: changelog.trim().split('\n').filter(Boolean),
      }
    } catch (err: any) {
      // Git not available or APP_DIR not mounted
      return {
        update_available: false,
        error: `Kan updates niet controleren: ${err.message?.slice(0, 100) ?? 'onbekende fout'}. Zorg dat ${APP_DIR} als volume gemount is.`,
      }
    }
  })

  // ── POST /api/admin/system/update-apply ──────────────────────
  fastify.post('/api/admin/system/update-apply', { preHandler: requireAdmin }, async (_, reply) => {
    // Write a pending status
    try {
      writeFileSync(RESULT_FILE, JSON.stringify({ success: false, status: 'running', timestamp: new Date().toISOString() }))
    } catch {}

    // Execute upgrade in background
    const script = `
      cd ${APP_DIR} &&
      git pull origin main --quiet &&
      docker compose build --quiet &&
      docker compose up -d --remove-orphans &&
      echo '{"success":true,"timestamp":"'$(date -Iseconds)'"}' > ${RESULT_FILE}
    `

    try {
      // Try executing on host via docker socket
      const child = spawn('sh', ['-c', script], {
        detached: true,
        stdio: 'ignore',
        cwd: APP_DIR,
      })
      child.unref()
      return { ok: true, message: 'Upgrade gestart.' }
    } catch {
      return reply.status(500).send({ error: 'Kon upgrade niet starten' })
    }
  })

  // ── GET /api/admin/system/update-status ─────────────────────
  fastify.get('/api/admin/system/update-status', { preHandler: requireAdmin }, async () => {
    try {
      const raw = readFileSync(RESULT_FILE, 'utf8').trim()
      const result = JSON.parse(raw)
      return { status: result.success ? 'success' : result.status === 'running' ? 'running' : 'failed', ...result }
    } catch {
      return { status: 'idle' }
    }
  })

  // ── POST /api/admin/system/rollback ─────────────────────────
  fastify.post('/api/admin/system/rollback', { preHandler: requireAdmin }, async (_, reply) => {
    try {
      await execAsync(`cd ${APP_DIR} && git checkout HEAD~1 && docker compose build --quiet && docker compose up -d`, { timeout: 300000 })
      return { ok: true }
    } catch (err: any) {
      return reply.status(500).send({ error: err.message?.slice(0, 200) ?? 'Rollback mislukt' })
    }
  })

  // ── POST /api/admin/system/backup ────────────────────────────
  fastify.post('/api/admin/system/backup', { preHandler: requireAdmin }, async (_, reply) => {
    try {
      // pg_dump via the db container
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `/tmp/grip-backup-${timestamp}.sql`
      await execAsync(
        `docker compose -f ${COMPOSE_FILE} exec -T db pg_dump -U grip grip > ${backupPath}`,
        { timeout: 120000 }
      )
      return { ok: true, path: backupPath }
    } catch (err: any) {
      // Fallback: try direct pg_dump if DATABASE_URL available
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const { stdout } = await execAsync(
          `pg_dump "${process.env.DATABASE_URL}" 2>/dev/null | head -1`,
          { timeout: 5000 }
        )
        return { ok: false, error: 'Backup via Docker niet mogelijk. Gebruik: docker compose exec db pg_dump -U grip grip > backup.sql' }
      } catch {
        return reply.status(500).send({ error: 'Backup mislukt. Voer handmatig uit op de host.' })
      }
    }
  })
}

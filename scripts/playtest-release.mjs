import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHECKS = [
  { id: 'lint', label: 'Lint', cmd: 'npm run lint' },
  { id: 'tests', label: 'Automated Tests', cmd: 'npm test' },
  { id: 'build', label: 'Production Build', cmd: 'npm run build' },
  { id: 'balance', label: 'Balance Simulation', cmd: 'npm run balance:sim' },
]

const now = new Date()
const safeStamp = now.toISOString().replace(/[:.]/g, '-')
const reportsDir = join(process.cwd(), 'reports')
mkdirSync(reportsDir, { recursive: true })

const runCheck = ({ id, label, cmd }) => {
  const startedAt = Date.now()
  try {
    const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' })
    return {
      id,
      label,
      cmd,
      ok: true,
      durationMs: Date.now() - startedAt,
      output: output.trim(),
    }
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : ''
    const stderr = error?.stderr ? String(error.stderr) : ''
    return {
      id,
      label,
      cmd,
      ok: false,
      durationMs: Date.now() - startedAt,
      output: `${stdout}\n${stderr}`.trim(),
    }
  }
}

const results = CHECKS.map(runCheck)
const passed = results.filter((item) => item.ok).length
const failed = results.length - passed

const lines = []
lines.push('# Playtest Release Report')
lines.push('')
lines.push(`- Generated: ${now.toISOString()}`)
lines.push(`- Passed: ${passed}/${results.length}`)
lines.push(`- Failed: ${failed}`)
lines.push('')

results.forEach((result) => {
  lines.push(`## ${result.label}`)
  lines.push('')
  lines.push(`- Command: \`${result.cmd}\``)
  lines.push(`- Status: ${result.ok ? 'PASS' : 'FAIL'}`)
  lines.push(`- Duration: ${(result.durationMs / 1000).toFixed(2)}s`)
  lines.push('')
  lines.push('```txt')
  lines.push(result.output || '(no output)')
  lines.push('```')
  lines.push('')
})

const reportPath = join(reportsDir, `release-check-${safeStamp}.md`)
writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')

console.log(`Release check report written: ${reportPath}`)

if (failed > 0) {
  process.exitCode = 1
}

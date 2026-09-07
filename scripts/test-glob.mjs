import { matchRule } from '../src/index.js'

const gitbash = 'C:/Program Files/Git/bin/bash.exe'
const cases = [
  ['bash', gitbash, true],
  ['pwsh', gitbash, false],
  ['aa', 'D:/tools/aa.exe', true],
  ['**/Git/bin/bash.exe', gitbash, true],
  ['**/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe', false],
  ['C:/Program Files/Git/**', gitbash, true],
  ['C:/Program Files/Git/**', 'C:/Program Files/GitHub/bin/bash.exe', false],
  ['*', gitbash, true],
]

let failed = 0
for (const [rule, path, expect] of cases) {
  const got = matchRule(rule, path)
  if (got !== expect) {
    console.error('FAIL', rule, path, 'got', got, 'want', expect)
    failed += 1
  } else {
    console.log('OK', rule, '->', expect)
  }
}
process.exit(failed === 0 ? 0 : 1)

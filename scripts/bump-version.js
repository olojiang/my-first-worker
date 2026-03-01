import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取当前版本
const versionFile = join(__dirname, '../src/version.js')
let content = readFileSync(versionFile, 'utf-8')

// 提取当前版本号
const versionMatch = content.match(/APP_VERSION = '([\d.]+)'/)
let version = versionMatch ? versionMatch[1] : '1.0.0'

// 递增补丁版本号
const parts = version.split('.').map(Number)
parts[2] = (parts[2] || 0) + 1
version = parts.join('.')

// 生成编译时间: MMDD_HHmm
const now = new Date()
const month = String(now.getMonth() + 1).padStart(2, '0')
const day = String(now.getDate()).padStart(2, '0')
const hours = String(now.getHours()).padStart(2, '0')
const minutes = String(now.getMinutes()).padStart(2, '0')
const buildTime = `${month}${day}_${hours}${minutes}`

// 生成新版本文件内容
const newContent = `// 自动生成的版本号文件
// 格式: MMDD_HHmm
export const BUILD_TIME = '${buildTime}'
export const APP_VERSION = '${version}'
export const VERSION_DISPLAY = \`\${APP_VERSION}_\${BUILD_TIME}\`
`

writeFileSync(versionFile, newContent)
console.log(`✅ Version bumped to ${version}_${buildTime}`)

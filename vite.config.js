import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署时需要设置 base 为你的仓库名
  // 例如仓库名为 medication-reminder，则 base 为 '/medication-reminder/'
  // 如果使用自定义域名或 username.github.io 仓库，设为 '/'
  base: '/medicationreminder/',
})

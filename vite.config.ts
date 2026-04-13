import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/OutFlow/', // 这里的名字必须和你的子文件夹名完全一致
  plugins: [react(), tailwindcss()],
})

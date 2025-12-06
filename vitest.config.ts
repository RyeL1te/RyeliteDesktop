import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'out', 'dist']
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@static': path.resolve(__dirname, 'static')
        }
    }
})
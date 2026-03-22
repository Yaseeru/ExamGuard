import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
     plugins: [react()],
     server: {
          port: 5173,
          proxy: {
               '/api': {
                    target: 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
               }
          }
     },
     build: {
          // Production build optimizations
          target: 'es2015',
          outDir: 'dist',
          assetsDir: 'assets',
          sourcemap: false, // Disable source maps in production for security
          rollupOptions: {
               output: {
                    // Manual chunk splitting for better caching
                    manualChunks: (id) => {
                         // Vendor chunks
                         if (id.includes('node_modules')) {
                              if (id.includes('react') || id.includes('react-dom')) {
                                   return 'react-vendor';
                              }
                              if (id.includes('react-router')) {
                                   return 'router-vendor';
                              }
                              if (id.includes('@headlessui') || id.includes('lucide-react')) {
                                   return 'ui-vendor';
                              }
                              if (id.includes('axios')) {
                                   return 'http-vendor';
                              }
                              if (id.includes('react-hook-form')) {
                                   return 'forms-vendor';
                              }
                              if (id.includes('react-hot-toast')) {
                                   return 'toast-vendor';
                              }
                              // Other vendor libraries
                              return 'vendor';
                         }

                         // Feature-based chunks
                         if (id.includes('/components/Admin/')) {
                              return 'admin-features';
                         }
                         if (id.includes('/components/Lecturer/')) {
                              return 'lecturer-features';
                         }
                         if (id.includes('/components/Student/')) {
                              return 'student-features';
                         }
                         if (id.includes('/components/Exam/')) {
                              return 'exam-features';
                         }
                         if (id.includes('/components/Auth/')) {
                              return 'auth-features';
                         }

                         // Utils and services
                         if (id.includes('/utils/') || id.includes('/services/')) {
                              return 'utils';
                         }
                    },
                    // Asset file naming with better caching
                    chunkFileNames: (chunkInfo) => {
                         const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
                         return `assets/js/[name]-[hash].js`;
                    },
                    entryFileNames: 'assets/js/[name]-[hash].js',
                    assetFileNames: (assetInfo) => {
                         const info = assetInfo.name.split('.');
                         const ext = info[info.length - 1];
                         if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                              return `assets/images/[name]-[hash].[ext]`;
                         }
                         if (/css/i.test(ext)) {
                              return `assets/css/[name]-[hash].[ext]`;
                         }
                         return `assets/[ext]/[name]-[hash].[ext]`;
                    }
               }
          },
          // Chunk size warning limit
          chunkSizeWarningLimit: 500, // Reduced from 1000 for better performance
          // Use esbuild for minification (faster than terser)
          minify: 'esbuild',
     },
     // Environment variable prefix
     envPrefix: 'VITE_',
     // Optimize dependencies
     optimizeDeps: {
          include: [
               'react',
               'react-dom',
               'react-router-dom',
               'axios',
               'react-hook-form',
               'react-hot-toast',
               '@headlessui/react',
               'lucide-react'
          ],
          exclude: ['@vite/client', '@vite/env']
     },
     test: {
          globals: true,
          environment: 'jsdom',
          setupFiles: './src/test/setup.js',
     }
})
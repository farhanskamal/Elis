import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Environment-specific configuration
    const isDev = mode === 'development';
    const isProd = mode === 'production';
    
    console.log(`🔧 Building in ${mode} mode`);
    console.log(`🌐 API URL: ${env.VITE_API_URL || 'https://letstestit.me/api'}`);
    
    return {
      plugins: [react()],
      server: {
        // Development server configuration
        host: true, // Allow external connections
        port: 5173,
        allowedHosts: ['letstestit.me', 'localhost', '.letstestit.me'],
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }
      },
      preview: {
        // Preview server configuration (for production builds)
        host: true,
        port: 4173,
        allowedHosts: ['letstestit.me', 'localhost', '.letstestit.me']
      },
      define: {
        // Environment variables
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Production build optimization
        target: 'es2015',
        outDir: 'dist',
        sourcemap: isProd ? false : true,
        minify: isProd ? 'esbuild' : false
      }
    };
});

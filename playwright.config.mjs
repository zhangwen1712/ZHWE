import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser', timeout:30000, retries:0,
 use:{...devices['iPhone 13'],browserName:'chromium',baseURL:'http://127.0.0.1:4177',launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}},
 webServer:{command:'node tests/support/static-server.mjs',url:'http://127.0.0.1:4177/',reuseExistingServer:!process.env.CI,timeout:30000},
 reporter:process.env.CI?[['list'],['html',{outputFolder:'playwright-report',open:'never'}]]:'list'
});

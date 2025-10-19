import { test, expect } from '@playwright/test'

test('diagnostic: login page renders', async ({ page }) => {
  // Clear storage
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  // Reload
  await page.goto('/login', { waitUntil: 'networkidle' })
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/diagnostic-login-page.png', fullPage: true })
  
  // Log URL
  console.log('Current URL:', page.url())
  
  // Log page title
  const title = await page.title()
  console.log('Page title:', title)
  
  // Check for common elements
  const hasEmailInput = await page.locator('input[type="email"]').count()
  const hasRoleButtons = await page.getByRole('button', { name: /Admin/i }).count()
  const hasForm = await page.locator('form').count()
  
  console.log('Email inputs found:', hasEmailInput)
  console.log('Role buttons found:', hasRoleButtons)
  console.log('Forms found:', hasForm)
  
  // Get page content
  const bodyText = await page.locator('body').textContent()
  console.log('Body text (first 500 chars):', bodyText?.substring(0, 500))
  
  // Check for errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  if (errors.length > 0) {
    console.log('Console errors:', errors)
  }
  
  // This test always passes - it's just for diagnostics
  expect(page.url()).toContain('/login')
})

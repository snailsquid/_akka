import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page at root', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check for neo-brutalist design elements
    await expect(page.locator('h1')).toContainText('BUILD');
    await expect(page.locator('h1')).toContainText('COMMANDS');
    await expect(page.locator('h1')).toContainText('WHATSAPP');
  });

  test('should have WhatsApp button with correct link', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Find WhatsApp button
    const whatsappButton = page.locator('a:has-text("START ON WHATSAPP")');
    await expect(whatsappButton).toBeVisible();
    
    // Verify link
    const href = await whatsappButton.getAttribute('href');
    expect(href).toContain('wa.me/6282128383086');
  });

  test('should display fallback contact number', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check for contact fallback text
    await expect(page.locator('text=+6282128383086')).toBeVisible();
  });

  test('should have developer portal button', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Find developer button
    const devButton = page.locator('a:has-text("DEVELOPER PORTAL")');
    await expect(devButton).toBeVisible();
    
    // Verify link
    const href = await devButton.getAttribute('href');
    expect(href).toBe('/developer');
  });

  test('should have neo-brutalist styling', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check for Space Grotesk font
    const body = page.locator('body');
    const fontFamily = await body.evaluate((el) => 
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Space Grotesk');
    
    // Check background color (cream)
    const bgColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    // Should be close to #FFFDF5
    expect(bgColor).toMatch(/rgb\(255, 253, 245\)/);
  });

  test('should have features section', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    await expect(page.locator('text=HOW IT WORKS')).toBeVisible();
    await expect(page.locator('text=FOR USERS')).toBeVisible();
    await expect(page.locator('text=FOR DEVELOPERS')).toBeVisible();
    await expect(page.locator('text=POWERFUL SDK')).toBeVisible();
  });

  test('should have footer with SDK link', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check for GitHub SDK link
    const sdkLink = page.locator('a[href="https://github.com/snailsquid/akka-sdk"]');
    await expect(sdkLink).toBeVisible();
  });
});

test.describe('Developer Dashboard', () => {
  test('should load developer dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/developer/');
    
    // Should show login page or dashboard
    const hasLogin = await page.locator('text=Developer Portal').isVisible();
    const hasDashboard = await page.locator('text=AKKA DEV').isVisible();
    
    expect(hasLogin || hasDashboard).toBeTruthy();
  });

  test('should have SDK section on dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/developer/');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Authentication Token').isVisible();
    
    if (!isLoginPage) {
      // If logged in, check for SDK section
      await expect(page.locator('text=Akka SDK')).toBeVisible();
      
      // Check for GitHub link
      const githubLink = page.locator('a[href="https://github.com/snailsquid/akka-sdk"]');
      await expect(githubLink).toBeVisible();
      
      // Check for NPM link
      const npmLink = page.locator('a[href="https://www.npmjs.com/package/@akka-bot/sdk"]');
      await expect(npmLink).toBeVisible();
    }
  });

  test('should have neo-brutalist styling', async ({ page }) => {
    await page.goto('http://localhost:3000/developer/');
    
    // Check for Space Grotesk font
    const body = page.locator('body');
    const fontFamily = await body.evaluate((el) => 
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Space Grotesk');
  });

  test('login page should have proper elements', async ({ page }) => {
    await page.goto('http://localhost:3000/developer/');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Authentication Token').isVisible();
    
    if (isLoginPage) {
      await expect(page.locator('text=AKKA')).toBeVisible();
      await expect(page.locator('text=Developer Portal')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Login")')).toBeVisible();
    }
  });
});

test.describe('Navigation', () => {
  test('should navigate from landing to developer portal', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Click developer portal button
    await page.click('a:has-text("DEVELOPER PORTAL")');
    
    // Should be on developer page
    await expect(page).toHaveURL(/.*\/developer/);
  });

  test('health endpoint should return JSON', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    expect(json).toHaveProperty('status', 'ok');
    expect(json).toHaveProperty('platform', 'akka');
  });
});

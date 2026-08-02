import { expect, test } from "@playwright/test";

test.describe("authentication entry points", () => {
  test("protected workspaces redirect to sign in without leaking content", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole("heading", { name: /sign in and keep scouting/i })).toBeVisible();
  });

  test("email signup validates identity fields and password confirmation", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("heading", { name: /join the european football network/i })).toBeVisible();
    const password = page.locator('input[name="password"]');
    await expect(password).toHaveAttribute("minlength", "8");
    await page.locator('input[name="display_name"]').fill("QA Member");
    await page.locator('input[name="email"]').fill("qa@example.com");
    await password.fill("StrongPass123!");
    await page.locator('input[name="confirm_password"]').fill("DifferentPass123!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("sign in exposes recovery and Google OAuth without an open redirect", async ({ page }) => {
    await page.goto("/auth/sign-in?next=https://attacker.invalid");
    await expect(page.locator('input[name="next"]').first()).toHaveValue("/welcome");
    await expect(page.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/auth/forgot-password");
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("forgot-password response does not disclose account existence", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator('input[name="email"]')).toHaveAttribute("type", "email");
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });
});

test.describe("privacy consent", () => {
  test("cookie choice is durable and can be reopened from the footer", async ({ page }) => {
    await page.goto("/auth/sign-in");

    const dialog = page.getByRole("dialog", { name: "Cookie consent" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Decline optional" }).click();
    await expect(dialog).toBeHidden();

    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("euroscout-cookie-consent") ?? "null"));
    expect(stored).toMatchObject({ version: 2, status: "declined" });
    expect(Date.parse(stored.expiresAt)).toBeGreaterThan(Date.now());

    await page.reload();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await expect(dialog).toBeVisible();
  });
});

test.describe("API security contracts", () => {
  test("Daily connectivity probe is accepted but unsigned events are rejected", async ({ request }) => {
    const probe = await request.post("/api/webhooks/daily", { data: { test: "test" } });
    expect(probe.status()).toBe(200);
    const unsigned = await request.post("/api/webhooks/daily", { data: { id: "untrusted", type: "meeting.ended", payload: { room: "no-room" } } });
    expect(unsigned.status()).toBe(401);
  });

  test("club media mutations require authentication", async ({ request }) => {
    const response = await request.delete("/api/account/club-media", { data: { teamId: "invalid", mediaId: "invalid" } });
    expect(response.status()).toBe(403);
  });
});

test("mobile auth pages do not overflow the viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile viewport assertion");
  await page.goto("/auth/sign-up");
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
});

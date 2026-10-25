#!/usr/bin/env node
/** Real-API design acceptance. Only personal appearance/preferences and optional
 * tenant branding may be written; their original values remain in memory and
 * are restored in finally. No API body, token, tenant/user ID or original setting
 * is written to evidence. Business/sample data writes are blocked. */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const require = createRequire(
  new URL("../backstage-portal/package.json", import.meta.url)
);
const { chromium, expect } = require("@playwright/test");
const base = new URL(
  process.env.LIVE_BASE_URL || "https://kai-platform-d0ae0.web.app"
).origin;
const candidate = process.env.CANDIDATE_API_BASE
  ? new URL(process.env.CANDIDATE_API_BASE).origin
  : null;
const phase = process.env.RELEASE_PHASE || "design";
assert.match(phase, /^[a-zA-Z0-9_-]+$/, "Use a simple evidence phase name");
const evidence = `${
  process.env.RELEASE_EVIDENCE_ROOT || "docs/design-refresh-20261011/evidence"
}/${phase}`;
const adminEnabled = process.env.CHECK_ADMIN_APPEARANCE === "true";
const readOnly = process.env.DESIGN_READ_ONLY === "true";
assert(
  !(readOnly && adminEnabled),
  "Read-only inspection cannot enable admin writes"
);
const accessCode = process.env.PREVIEW_ACCESS_CODE || "demo1234";
const designs = ["Aurora", "Focus", "Orbit", "Canvas"];
const viewports = [1440, 390, 320];
const routes = ["/portal-work", "/project-workspace", "/my-page"];
const started = Date.now();
await fs.mkdir(evidence, { recursive: true });

const report = {
  phase,
  uiOrigin: base,
  candidateApiOrigin: candidate,
  startedAt: new Date().toISOString(),
  mockedApiResponses: false,
  businessWritesAllowed: false,
  capturesMasked: true,
  adminAppearanceRequested: adminEnabled,
  personalAppearanceRequested: !readOnly,
  checks: [],
  screenshots: [],
  responses: [],
  blockedWrites: [],
  pageErrors: [],
  networkFailures: [],
  serverFailures: [],
  layoutFailures: [],
  restoration: { personal: "not-required", tenant: "not-required" },
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  serviceWorkers: "block",
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const activeApi = new Set();
const pendingResponses = new Set();
const privateState = {
  headers: null,
  apiOrigin: candidate,
  originalPreferences: null,
  testedPreferences: null,
  originalSettings: null,
  testedSettings: null,
  personalTouched: false,
  tenantTouched: false,
};
const apiPath = (url) => new URL(url).pathname;
const isApi = (url) => apiPath(url).startsWith("/api/");
const recordResponse = (method, path, status) => {
  const entry = { method, path, status };
  report.responses.push(entry);
  if (status >= 500) report.serverFailures.push(entry);
};

page.on("pageerror", (error) =>
  report.pageErrors.push({ name: error.name, path: apiPath(page.url()) })
);
page.on("request", (request) => {
  if (!isApi(request.url())) return;
  activeApi.add(request);
  const headers = request.headers();
  if (
    apiPath(request.url()).startsWith("/api/portal/") &&
    headers.authorization &&
    headers["x-portal-tenant-id"]
  ) {
    privateState.headers = {
      Authorization: headers.authorization,
      "x-portal-tenant-id": headers["x-portal-tenant-id"],
      "Content-Type": "application/json",
    };
    privateState.apiOrigin = candidate || new URL(request.url()).origin;
  }
});
page.on("requestfinished", (request) => activeApi.delete(request));
page.on("requestfailed", (request) => {
  activeApi.delete(request);
  if (
    isApi(request.url()) &&
    !request.failure()?.errorText?.includes("ERR_ABORTED")
  )
    report.networkFailures.push({
      method: request.method(),
      path: apiPath(request.url()),
    });
});
page.on("response", (response) => {
  if (!isApi(response.url())) return;
  const path = apiPath(response.url());
  recordResponse(response.request().method(), path, response.status());
  if (
    response.request().method() === "PUT" &&
    response.status() === 200 &&
    ["/api/portal/v1/preferences", "/api/portal/v1/tenant-settings"].includes(
      path
    )
  ) {
    const task = response
      .json()
      .then((result) => {
        if (path.endsWith("/preferences"))
          privateState.testedPreferences = structuredClone(result.data);
        else privateState.testedSettings = structuredClone(result.data);
      })
      .catch(() => {})
      .finally(() => pendingResponses.delete(task));
    pendingResponses.add(task);
  }
});
await context.route("**/api/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const readable = ["GET", "HEAD", "OPTIONS"].includes(request.method());
  const telemetry = [
    "/api/portal/v1/context/tenant",
    "/api/portal/v1/activity",
    "/api/auth/guest/refresh",
    "/api/auth/oidc/refresh",
    "/api/permission/authorize",
  ].includes(url.pathname);
  const scopedAppearance =
    !readOnly &&
    request.method() === "PUT" &&
    (url.pathname === "/api/portal/v1/preferences" ||
      (adminEnabled && url.pathname === "/api/portal/v1/tenant-settings"));
  if (!readable && !telemetry && !scopedAppearance) {
    report.blockedWrites.push({ method: request.method(), path: url.pathname });
    await route.abort("blockedbyclient");
    return;
  }
  if (!candidate) {
    await route.continue();
    return;
  }
  try {
    const response = await route.fetch({
      url: candidate + url.pathname + url.search,
      timeout: 45000,
    });
    // Adapt CORS transport only. The real candidate returns all statuses/data.
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "access-control-allow-origin": base,
        "access-control-allow-credentials": "true",
      },
    });
  } catch {
    report.networkFailures.push({
      method: request.method(),
      path: url.pathname,
    });
    await route.abort("failed");
  }
});

const settle = async () => {
  await expect.poll(() => activeApi.size, { timeout: 45000 }).toBe(0);
  await page.waitForTimeout(200);
  await expect.poll(() => activeApi.size, { timeout: 45000 }).toBe(0);
  await Promise.allSettled([...pendingResponses]);
};
const screenshot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const masks = [
    page.locator("input, textarea, .identity-facts dd, .identity-summary h3"),
  ];
  if (page.url().includes("/project-workspace"))
    masks.push(page.locator("tbody"));
  const file = `${name}.png`;
  await page.screenshot({
    path: `${evidence}/${file}`,
    fullPage: true,
    animations: "disabled",
    mask: masks,
  });
  report.screenshots.push(file);
};
const check = async (name, run) => {
  try {
    await run();
    report.checks.push({ name, passed: true });
    console.log("PASS", name);
    return true;
  } catch (error) {
    report.checks.push({
      name,
      passed: false,
      failureClass: error?.name || "Error",
    });
    console.error("FAIL", name, `(${error?.name || "Error"})`);
    await screenshot(`failure-${report.checks.length}`).catch(() => {});
    return false;
  }
};
const required = async (name, run) => {
  if (!(await check(name, run)))
    throw new Error("Required acceptance step failed");
};
const api = async (route, { method = "GET", body } = {}) => {
  assert(
    privateState.headers && privateState.apiOrigin,
    "Authenticated portal scope must be captured first"
  );
  assert(
    method === "GET" ||
      (!readOnly &&
        method === "PUT" &&
        (route === "/preferences" ||
          (adminEnabled && route === "/tenant-settings"))),
    "Only scoped appearance writes are allowed"
  );
  const response = await fetch(
    `${privateState.apiOrigin}/api/portal/v1${route}`,
    {
      method,
      headers: privateState.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    }
  );
  recordResponse(method, `/api/portal/v1${route}`, response.status);
  assert.equal(
    response.status,
    200,
    "Authenticated appearance API must return 200"
  );
  const result = await response.json();
  assert.equal(
    result.meta?.dataMode,
    "live",
    "Real server API metadata is required"
  );
  return result.data;
};
const goto = async (route) => {
  await page.goto(base + route, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.getByTestId("portal-shell").waitFor();
  await settle();
};
const overflow = async () => {
  const metrics = await page.evaluate(() => {
    const header = document.querySelector(".portal-shell-experience > header");
    return {
      viewportWidth: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      headerChildren: Array.from(header?.children || []).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          classes:
            typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      }),
    };
  });
  if (metrics.pageWidth > metrics.viewportWidth + 1)
    report.layoutFailures.push({ path: apiPath(page.url()), ...metrics });
  assert(
    metrics.pageWidth <= metrics.viewportWidth + 1,
    "Page-level horizontal overflow"
  );
};
const appearance = async (design) => {
  await expect(page.getByTestId("portal-shell")).toHaveAttribute(
    "data-design",
    design
  );
  await expect(page.locator(".portal-appearance")).toHaveAttribute(
    "data-design",
    design
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.portalDesign)
    )
    .toBe(design);
};
const chooseScale = async (id, scale) => {
  await page.locator(`#${id}`).click();
  const labels = { 0.9: "작게", 1: "기본", 1.1: "크게", 1.2: "아주 크게" };
  const name =
    scale === undefined
      ? /^군 기본 설정 · \d+%$/
      : `${labels[scale]} · ${Math.round(scale * 100)}%`;
  await page
    .getByRole("option", { name, exact: typeof name === "string" })
    .click();
  await expect(page.getByRole("listbox")).toBeHidden();
};
const savePersonal = async (design, scale) => {
  await goto("/my-page?tab=appearance");
  await page.getByTestId("appearance-settings-panel").waitFor();
  assert.deepEqual(
    (await api("/platform-access")).preferences,
    privateState.testedPreferences ?? privateState.originalPreferences,
    "Do not write over a concurrent personal preference change"
  );
  const choose = async (selected) =>
    page
      .getByRole("button", {
        name: `개인 디자인 ${
          selected === "tenant"
            ? "군 기본 설정"
            : designs.find((name) => name.toLowerCase() === selected)
        }`,
        exact: true,
      })
      .click();
  const commit = async () => {
    privateState.personalTouched = true;
    const response = page.waitForResponse(
      (r) =>
        apiPath(r.url()) === "/api/portal/v1/preferences" &&
        r.request().method() === "PUT"
    );
    response.catch(() => {});
    await page
      .getByRole("button", { name: "화면 설정 저장", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await settle();
    await expect(
      page.getByText(
        "화면 설정을 저장했습니다. 홈과 모든 업무 화면에 적용되었습니다.",
        { exact: true }
      )
    ).toBeVisible();
  };
  await choose(design);
  await chooseScale("personal-font-scale", scale);
  // If already saved, make a reversible personal choice first so the acceptance
  // still exercises a real UI save and exits temporary review through the UI.
  if (
    await page
      .getByRole("button", { name: "화면 설정 저장", exact: true })
      .isDisabled()
  ) {
    await choose(design === "orbit" ? "focus" : "orbit");
    await commit();
    await choose(design);
  }
  await commit();
  const saved = (await api("/platform-access")).preferences;
  assert.equal(saved.design, design);
  assert.equal(saved.fontScale, scale);
  assert.deepEqual(
    saved.platformOrder,
    privateState.originalPreferences.platformOrder
  );
  assert.deepEqual(saved.favorites, privateState.originalPreferences.favorites);
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("kai.portal.home-design")),
    null,
    "Saving must exit temporary concept review"
  );
};
const measuredFonts = async () => {
  await goto("/portal-work");
  const body = await page
    .locator(".work-heading p")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize)
    );
  await goto("/project-workspace");
  const table = await page
    .locator('table[aria-label="서버 프로젝트 목록"] th')
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize)
    );
  return { body, table };
};
const retryRestore = async (run) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await run();
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
};

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("접근코드", { exact: true }).waitFor();
  for (const width of viewports)
    await required(
      `login ${width}px exposes four choices without Google login`,
      async () => {
        await page.setViewportSize({ width, height: 1000 });
        await expect(
          page.getByRole("button", { name: /메인으로 입장/ })
        ).toHaveCount(4);
        await expect(
          page.getByRole("button", { name: /Google|구글/i })
        ).toHaveCount(0);
        await expect(page.locator("main")).not.toContainText(
          /Google 로그인|구글 로그인/
        );
        await overflow();
        await screenshot(`login-${width}`);
      }
    );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("접근코드", { exact: true }).fill(accessCode);
  await page
    .getByRole("button", { name: "01 Aurora 메인으로 입장", exact: true })
    .click();
  await page.getByTestId("portal-home").waitFor({ timeout: 60000 });
  await settle();
  await required(
    "captures actual authenticated preferences before any appearance change",
    async () => {
      const access = await api("/platform-access");
      privateState.originalPreferences = structuredClone(access.preferences);
      assert(Array.isArray(access.preferences.platformOrder));
      assert(Array.isArray(access.preferences.favorites));
    }
  );

  for (const [index, name] of designs.entries()) {
    const design = name.toLowerCase();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await goto("/");
    await page
      .getByRole("button", { name: `0${index + 1} ${name}`, exact: true })
      .click();
    await appearance(design);
    const headerBackground = await page
      .locator(".portal-shell-experience > header")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    for (const width of viewports)
      await check(`${name} homepage ${width}px`, async () => {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.getByTestId("portal-home")).toHaveAttribute(
          "data-design",
          design
        );
        await expect(page.locator(".platform-card")).toHaveCount(4);
        await overflow();
        await screenshot(`home-${design}-${width}`);
      });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check(
      `${name} launcher inherits global appearance outside route wrapper`,
      async () => {
        await page
          .getByRole("button", { name: "모든 앱", exact: true })
          .click();
        const dialog = page.getByRole("dialog", {
          name: "모든 앱",
          exact: true,
        });
        await expect(dialog).toBeVisible();
        assert.equal(
          await dialog.evaluate((element) =>
            getComputedStyle(element).getPropertyValue("--portal-header").trim()
          ),
          await page
            .locator(".portal-appearance")
            .evaluate((element) =>
              getComputedStyle(element)
                .getPropertyValue("--portal-header")
                .trim()
            )
        );
        assert.equal(
          await dialog.evaluate(
            (element) => element.closest(".portal-appearance") === null
          ),
          true,
          "Launcher must actually exercise portal-mounted appearance"
        );
        await expect(dialog.locator(".launcher-apps button")).toHaveCount(4);
        await screenshot(`launcher-${design}`);
        await page
          .getByRole("button", { name: "앱 메뉴 닫기", exact: true })
          .click();
      }
    );
    await page.keyboard.press("Escape");
    for (const route of routes) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await goto(route);
      for (const width of viewports)
        await check(
          `${name} ${route} ${width}px keeps the same concept and fits`,
          async () => {
            await page.setViewportSize({ width, height: 1000 });
            await appearance(design);
            assert.equal(
              await page
                .locator(".portal-shell-experience > header")
                .evaluate(
                  (element) => getComputedStyle(element).backgroundColor
                ),
              headerBackground,
              "Header appearance must stay consistent between home and functional routes"
            );
            await expect(page.locator("main")).not.toContainText(
              /집계 중 오류|접근 권한이 없습니다|소속 군의 포털을 불러오는 중입니다/
            );
            await overflow();
            await screenshot(`${design}${route.replaceAll("/", "-")}-${width}`);
          }
        );
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  if (!readOnly) {
    let baseline;
    await required(
      "personal design and 100% font save through real UI preserves favorites/order",
      async () => {
        await savePersonal("aurora", 1);
        baseline = await measuredFonts();
        assert(baseline.body > 0 && baseline.table > 0);
        report.fontMeasurement = { baseline };
      }
    );
    await required(
      "personal Orbit and 120% font persist across reload with larger body/table text",
      async () => {
        await savePersonal("orbit", 1.2);
        await page.reload({ waitUntil: "domcontentloaded" });
        await settle();
        await appearance("orbit");
        await expect(page.locator(".portal-appearance")).toHaveAttribute(
          "data-font-scale",
          "1.2"
        );
        const enlarged = await measuredFonts();
        report.fontMeasurement.enlarged = enlarged;
        assert(
          enlarged.body >= baseline.body * 1.15,
          "Body text must meaningfully grow at 120%"
        );
        assert(
          enlarged.table >= baseline.table * 1.15,
          "Table text must meaningfully grow at 120%"
        );
        await screenshot("persisted-orbit-font-120");
      }
    );
    await page.setViewportSize({ width: 320, height: 1000 });
    await goto("/");
    for (const [index, name] of designs.entries())
      await check(
        `${name} homepage 320px at actual saved 120% font size`,
        async () => {
          await page
            .getByRole("button", { name: `0${index + 1} ${name}`, exact: true })
            .click();
          await appearance(name.toLowerCase());
          await expect(page.locator(".portal-appearance")).toHaveAttribute(
            "data-font-scale",
            "1.2"
          );
          await overflow();
          await screenshot(`font-120-home-${name.toLowerCase()}-320`);
        }
      );
    await page.getByRole("button", { name: "03 Orbit", exact: true }).click();
    for (const route of [
      "/portal-work",
      "/project-workspace",
      "/my-page?tab=appearance",
    ])
      await check(`${route} 320px at actual saved 120% font size`, async () => {
        await goto(route);
        await appearance("orbit");
        await expect(page.locator(".portal-appearance")).toHaveAttribute(
          "data-font-scale",
          "1.2"
        );
        await overflow();
        await screenshot(
          `font-120${apiPath(page.url()).replaceAll("/", "-")}-320`
        );
      });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await required(
      "personal reset inherits actual tenant design and font size",
      async () => {
        await goto("/my-page?tab=appearance");
        assert.deepEqual(
          (await api("/platform-access")).preferences,
          privateState.testedPreferences,
          "Do not reset over a concurrent personal preference change"
        );
        await page
          .getByRole("button", { name: "군 기본값으로 채우기", exact: true })
          .click();
        privateState.personalTouched = true;
        const response = page.waitForResponse(
          (r) =>
            apiPath(r.url()) === "/api/portal/v1/preferences" &&
            r.request().method() === "PUT"
        );
        response.catch(() => {});
        await page
          .getByRole("button", { name: "화면 설정 저장", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await settle();
        const settings = await api("/tenant-settings");
        const prefs = (await api("/platform-access")).preferences;
        assert.equal(prefs.design, "tenant");
        assert.equal(prefs.fontScale, undefined);
        assert.deepEqual(
          prefs.platformOrder,
          privateState.originalPreferences.platformOrder
        );
        assert.deepEqual(
          prefs.favorites,
          privateState.originalPreferences.favorites
        );
        await appearance(settings.branding.design ?? "aurora");
        await expect(page.locator(".portal-appearance")).toHaveAttribute(
          "data-font-scale",
          String(settings.branding.fontScale ?? 1)
        );
        await screenshot("personal-inherits-tenant");
      }
    );

    if (adminEnabled)
      await required(
        "authorized administrator changes tenant concept/font with real versioned save",
        async () => {
          const me = await api("/me");
          const membership = me.memberships?.find(
            (item) =>
              item.tenant_id === privateState.headers["x-portal-tenant-id"]
          );
          if (
            !membership?.permissions?.some((permission) =>
              ["settings.manage", "tenant.manage"].includes(permission)
            )
          ) {
            report.adminAppearanceSkipped =
              "Current membership has no branding management permission";
            return;
          }
          privateState.originalSettings = structuredClone(
            await api("/tenant-settings")
          );
          await goto("/tenant-settings");
          assert.deepEqual(
            await api("/tenant-settings"),
            privateState.originalSettings,
            "Tenant settings changed while the editor opened"
          );
          const target =
            privateState.originalSettings.branding.design === "focus"
              ? "Orbit"
              : "Focus";
          await page
            .getByRole("button", {
              name: `군 기본 디자인 ${target}`,
              exact: true,
            })
            .click();
          await chooseScale("branding-font-scale", 1.1);
          privateState.tenantTouched = true;
          privateState.testedSettings = {
            ...privateState.originalSettings,
            branding: {
              ...privateState.originalSettings.branding,
              design: target.toLowerCase(),
              fontScale: 1.1,
            },
            version: privateState.originalSettings.version + 1,
          };
          const response = page.waitForResponse(
            (r) =>
              apiPath(r.url()) === "/api/portal/v1/tenant-settings" &&
              r.request().method() === "PUT"
          );
          response.catch(() => {});
          await page
            .getByRole("button", { name: "변경사항 저장", exact: true })
            .click();
          assert.equal((await response).status(), 200);
          await settle();
          privateState.testedSettings = structuredClone(
            await api("/tenant-settings")
          );
          assert.equal(
            privateState.testedSettings.branding.design,
            target.toLowerCase()
          );
          assert.equal(privateState.testedSettings.branding.fontScale, 1.1);
          assert.equal(
            privateState.testedSettings.version,
            privateState.originalSettings.version + 1
          );
          assert.deepEqual(
            privateState.testedSettings.menus,
            privateState.originalSettings.menus
          );
          await page.reload({ waitUntil: "domcontentloaded" });
          await settle();
          await appearance(target.toLowerCase());
          await expect(page.locator(".portal-appearance")).toHaveAttribute(
            "data-font-scale",
            "1.1"
          );
          await screenshot("administrator-saved-tenant-appearance");
        }
      );
  }
} catch (error) {
  report.fatalFailure = { name: error?.name || "Error" };
} finally {
  await settle().catch(() => {});
  if (privateState.tenantTouched && privateState.originalSettings) {
    report.restoration.tenant = "pending";
    try {
      await retryRestore(async () => {
        const current = await api("/tenant-settings");
        if (
          JSON.stringify(current.branding) ===
            JSON.stringify(privateState.originalSettings.branding) &&
          JSON.stringify(current.menus) ===
            JSON.stringify(privateState.originalSettings.menus)
        )
          return;
        if (privateState.testedSettings) {
          assert.deepEqual(
            current.branding,
            privateState.testedSettings.branding,
            "Do not overwrite a concurrent administrator change"
          );
          assert.deepEqual(
            current.menus,
            privateState.testedSettings.menus,
            "Do not overwrite a concurrent menu change"
          );
        }
        await api("/tenant-settings", {
          method: "PUT",
          body: {
            branding: privateState.originalSettings.branding,
            menus: privateState.originalSettings.menus,
            expectedVersion: current.version,
          },
        });
        const restored = await api("/tenant-settings");
        assert.deepEqual(
          restored.branding,
          privateState.originalSettings.branding
        );
        assert.deepEqual(restored.menus, privateState.originalSettings.menus);
      });
      report.restoration.tenant = "restored";
      console.log("PASS restored original tenant appearance");
    } catch (error) {
      report.restoration.tenant = "failed";
      report.restoration.tenantFailureClass = error?.name || "Error";
    }
  }
  if (privateState.personalTouched && privateState.originalPreferences) {
    report.restoration.personal = "pending";
    try {
      await retryRestore(async () => {
        const current = (await api("/platform-access")).preferences;
        if (
          JSON.stringify(current) ===
          JSON.stringify(privateState.originalPreferences)
        )
          return;
        if (privateState.testedPreferences)
          assert.deepEqual(
            current,
            privateState.testedPreferences,
            "Do not overwrite a concurrent personal preference change"
          );
        await api("/preferences", {
          method: "PUT",
          body: privateState.originalPreferences,
        });
        assert.deepEqual(
          (await api("/platform-access")).preferences,
          privateState.originalPreferences
        );
      });
      report.restoration.personal = "restored";
      console.log("PASS restored original personal preferences");
    } catch (error) {
      report.restoration.personal = "failed";
      report.restoration.personalFailureClass = error?.name || "Error";
    }
  }
  await settle().catch(() => {});
  report.completedAt = new Date().toISOString();
  report.durationSeconds = Math.round((Date.now() - started) / 1000);
  report.passed =
    !report.fatalFailure &&
    report.checks.every((item) => item.passed) &&
    !report.blockedWrites.length &&
    !report.pageErrors.length &&
    !report.networkFailures.length &&
    !report.serverFailures.length &&
    !Object.values(report.restoration).includes("failed");
  report.summary = {
    checks: report.checks.length,
    passed: report.checks.filter((item) => item.passed).length,
    failed: report.checks.filter((item) => !item.passed).length,
    screenshots: report.screenshots.length,
  };
  await fs.writeFile(
    `${evidence}/appearance-report.json`,
    JSON.stringify(report, null, 2)
  );
  await browser.close();
  console.log(
    JSON.stringify({
      ...report.summary,
      restoration: report.restoration,
      durationSeconds: report.durationSeconds,
      acceptancePassed: report.passed,
    })
  );
  if (!report.passed) process.exitCode = 1;
}

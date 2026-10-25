#!/usr/bin/env node
// Full frontend + actual BFF + disposable PostgreSQL; only auth provider is local test fixture.
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createCustomerReviewServer } from "./lib/customer-review-server.mjs";
const require = createRequire(
  new URL("../backstage-portal/package.json", import.meta.url)
);
const { chromium, expect } = require("@playwright/test");
const evidence = "docs/customer-demo-20261001/evidence";
await fs.mkdir(evidence, { recursive: true });
const service = await createCustomerReviewServer();
const browser = await chromium.launch();
const checks = [],
  errors = [];
let page;
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log("PASS", name);
};
const screenshot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${evidence}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
};
const login = async (role = "portal-admin") => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    { name: "review_role", value: role, url: service.base },
  ]);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(service.base);
  await page.getByLabel("접근코드", { exact: true }).fill("demo1234");
  await page.getByRole("button", { name: "01 Aurora 메인으로 입장" }).click();
  await page.getByTestId("portal-home").waitFor();
  return context;
};
const goto = async (route) => {
  await page.goto(service.base + route);
  await page.getByTestId("portal-shell").waitFor();
  await expect(page.locator("main")).not.toContainText(
    "소속 군의 포털을 불러오는 중입니다."
  );
};
try {
  const created = await service.api("/projects", {
    method: "POST",
    actor: "general-user",
    body: {
      name: "군수 데이터 분석 프로젝트",
      description:
        "고객 시연 검증용 합성 프로젝트. 실증 전용 기능이 아닌 일반 프로젝트입니다.",
      purpose: "분석 업무",
      visibility: "public",
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  await login();
  await check(
    "production API mode retains four login/home designs independently of mock mode",
    async () => {
      for (const [i, name] of [
        "Aurora",
        "Focus",
        "Orbit",
        "Canvas",
      ].entries()) {
        await page
          .getByRole("button", { name: `0${i + 1} ${name}`, exact: true })
          .click();
        await expect(page.getByTestId("portal-home")).toHaveAttribute(
          "data-design",
          name.toLowerCase()
        );
        await expect(page.locator(".platform-card")).toHaveCount(4);
        await screenshot(`after-home-${name.toLowerCase()}`);
      }
      await expect(page.locator("body")).not.toContainText(
        "고객 협의용 · 예시 환경"
      );
    }
  );
  await check(
    "authorized multi-tenant selector opens and switches real API scope",
    async () => {
      await page.getByLabel("소속 군 선택").click();
      await expect(
        page.getByRole("option", { name: "육군", exact: true })
      ).toBeVisible();
      await page.getByRole("option", { name: "육군", exact: true }).click();
      await expect(page.getByLabel("소속 군 선택")).toHaveText("육군");
      await page.getByTestId("portal-home").waitFor();
    }
  );
  await check(
    "work overview loads actual ledgers without aggregation failure",
    async () => {
      await page.locator(".home-work-button").click();
      await expect(page.getByTestId("portal-work")).toHaveAttribute(
        "data-profile",
        "operations"
      );
      await expect(page.locator("main")).not.toContainText("집계 중 오류");
      await expect(page.locator("main")).not.toContainText(
        "업무 정보를 불러오지 못했습니다"
      );
      await screenshot("after-work-admin");
    }
  );
  await check(
    "all active authorized pages render without JS errors or requirement IDs",
    async () => {
      for (const route of [
        "/project-workspace",
        "/export-approval",
        "/credit-manager",
        "/krmf-monitor",
        "/integrated-search",
        "/admin-console",
        "/role-menu-preview",
        "/service-catalog",
        "/proposal-board",
        "/my-page",
        "/environment-settings",
        "/tenant-management",
        "/tenant-settings",
        "/audit-history",
        "/developer-console",
      ]) {
        await goto(route);
        await page.waitForTimeout(250);
        const text = await page.locator("main").innerText();
        assert(
          !/\b(?:SFR|SER|TER)-\d{3}\b/.test(text),
          route + " requirement ID visible"
        );
        assert(
          !text.includes("실증 프로젝트"),
          route + " invented pilot UI visible"
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          route + " desktop overflow"
        );
        if (route === "/project-workspace") {
          const header = page.locator("thead th").first();
          await expect(header).toHaveCSS("white-space", "nowrap");
          await expect(header).toHaveCSS(
            "background-color",
            "rgb(242, 245, 249)"
          );
        }
        if (route === "/credit-manager") {
          await expect(page.locator(".credit-empty-state").first()).toHaveCSS("background-color", "rgb(247, 249, 252)");
        }
        await screenshot("after" + route.replaceAll("/", "-"));
      }
    }
  );
  await check(
    "scoped developer catalog excludes invented pilot API contracts",
    async () => {
      await goto("/developer-console");
      await expect(
        page.getByRole("tab", { name: "API 카탈로그 34" })
      ).toBeVisible();
      await expect(page.locator("body")).not.toContainText("/api/pilot/");
    }
  );
  await login("general-user");
  await check(
    "single-tenant user can inspect selection without granting unauthorized tenants",
    async () => {
      await page.getByLabel("소속 군 선택").click();
      await expect(
        page.getByText(
          "현재 계정에 등록된 소속은 1개입니다. 다른 소속은 관리자의 등록이 필요합니다."
        )
      ).toBeVisible();
      await expect(
        page.getByRole("option", { name: "해군", exact: true })
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await goto("/portal-work?captureRole=portal-admin");
      await expect(page.getByTestId("portal-work")).toHaveAttribute(
        "data-profile",
        "personal"
      );
    }
  );
  await check(
    "defense profile saves to actual DB and restores after reload",
    async () => {
      await goto("/my-page?tab=profile");
      await page.getByLabel("사용자 구분").click();
      await page
        .getByRole("option", { name: "군 내부 사용자", exact: true })
        .click();
      await page.getByLabel("신분 구분").click();
      await page.getByRole("option", { name: "군인", exact: true }).click();
      await page
        .getByLabel("군번 / 군무원 직원번호", { exact: true })
        .fill("TEST-2026-001");
      await page.getByLabel("계급 / 직급", { exact: true }).fill("대위");
      await page
        .getByLabel("소속부대 / 기관", { exact: true })
        .fill("고객 시연 부대");
      await page.getByLabel("부서", { exact: true }).fill("정보화 부서");
      await page
        .getByRole("button", { name: "프로필 저장", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "프로필을 저장했습니다."
      );
      await page.reload();
      await expect(
        page.getByLabel("군번 / 군무원 직원번호", { exact: true })
      ).toHaveValue("TEST-2026-001");
      await screenshot("after-defense-profile");
    }
  );
  await check(
    "external profile removes military-only fields and persists distinction",
    async () => {
      await page.getByLabel("사용자 구분").click();
      await page
        .getByRole("option", { name: "외부 사용자", exact: true })
        .click();
      await expect(
        page.getByLabel("군번 / 군무원 직원번호", { exact: true })
      ).toHaveCount(0);
      await page
        .getByLabel("소속 회사 / 연구기관", { exact: true })
        .fill("시연 연구기관");
      await page
        .getByRole("button", { name: "프로필 저장", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "프로필을 저장했습니다."
      );
      const response = await service.api("/me/profile", {
        actor: "general-user",
      });
      assert.equal(response.body.data.profile.userCategory, "external");
      assert.equal(response.body.data.profile.militaryNumber, "");
    }
  );
  await check(
    "profile API rejects stale writes, identity fields and cross-user access",
    async () => {
      const current = await service.api("/me/profile", {
        actor: "general-user",
      });
      const profile = current.body.data.profile;
      const stale = await service.api("/me/profile", {
        actor: "general-user",
        method: "PATCH",
        body: { profile, expectedVersion: 0 },
      });
      assert.equal(stale.status, 409);
      const forged = await service.api("/me/profile", {
        actor: "general-user",
        method: "PATCH",
        body: {
          profile: { ...profile, user_id: service.actors["portal-admin"] },
          expectedVersion: current.body.data.version,
        },
      });
      assert.equal(forged.status, 422);
      const other = await service.api("/me/profile", {
        actor: "project-manager",
      });
      assert.equal(other.body.data.version, 0);
      assert.equal(other.body.data.profile.affiliation, "");
      const cross = await service.api("/me/profile", {
        actor: "general-user",
        tenant: "navy",
      });
      assert.equal(cross.status, 403);
    }
  );
  await check(
    "active sessions never present sample records or simulated revocation in server mode",
    async () => {
      await goto("/my-page?tab=sessions");
      await expect(page.locator("main")).toContainText(
        "활성 세션 조회·종료는 아직 연결되지 않았습니다"
      );
      await expect(
        page.getByRole("button", { name: /강제 종료|전체 다른 세션 종료/ })
      ).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText("10.20.30.40");
      await screenshot("after-sessions");
    }
  );
  await check(
    "personal projects use actual membership and readable cards, not narrow resource tables",
    async () => {
      await goto("/my-page?tab=projects");
      await expect(page.locator("main")).toContainText(
        "군수 데이터 분석 프로젝트"
      );
      await expect(
        page.getByRole("tab", { name: "실증 프로젝트", exact: true })
      ).toHaveCount(0);
      await page.getByLabel("현재 목록에서 프로젝트 검색").fill("군수");
      await expect(page.locator(".my-project-toolbar > button")).toHaveCSS("white-space", "nowrap");
      await expect(page.locator(".my-project-toolbar > button")).toHaveCSS("min-width", "88px");
      await screenshot("after-my-projects");
    }
  );
  await check(
    "ordinary user can read own real activity without audit-admin permission",
    async () => {
      await goto("/my-page?tab=activity");
      await expect(page.locator("main")).not.toContainText(
        "내 활동 기록을 불러오지 못했습니다"
      );
      const result = await service.api("/me/activity", {
        actor: "general-user",
      });
      assert.equal(result.status, 200);
      assert(result.body.data.items.length > 0);
    }
  );
  await check(
    "work environment request is persisted through UI and reviewed through real API",
    async () => {
      await goto("/project-workspace?tab=request");
      await page.getByLabel("프로젝트 선택").click();
      await page
        .getByRole("option", { name: "군수 데이터 분석 프로젝트", exact: true })
        .click();
      await page.getByLabel(/^워크스페이스명/).fill("시연 분석 작업환경");
      await page.getByLabel(/^CPU \(Core\)/).fill("4");
      await page.getByLabel(/^메모리 \(GiB\)/).fill("16");
      await page.getByLabel(/^저장소 \(GiB\)/).fill("100");
      const start = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        end = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
      await page.getByLabel(/^사용 시작일/).fill(start);
      await page.getByLabel(/^사용 종료일/).fill(end);
      await page
        .getByRole("button", { name: "신청 제출", exact: true })
        .click();
      await expect(page.locator("main")).toContainText(
        "작업환경 신청을 접수했습니다."
      );
      const result = await service.api("/work/requests?scope=mine", {
        actor: "general-user",
      });
      assert.equal(result.status, 200);
      const items = result.body.data.items;
      assert(
        items.some(
          (item) =>
            item.title === "시연 분석 작업환경" ||
            item.payload?.workspaceName === "시연 분석 작업환경"
        ),
        JSON.stringify(items)
      );
      const submitted = items.find(
        (item) => item.payload?.workspaceName === "시연 분석 작업환경"
      );
      await login("portal-admin");
      await page.getByLabel("소속 군 선택").click();
      await page.getByRole("option", { name: "육군", exact: true }).click();
      await expect(page.getByLabel("소속 군 선택")).toHaveText("육군");
      await page.getByTestId("portal-home").waitFor();
      await goto("/project-workspace?tab=request");
      await page
        .getByRole("button", { name: "승인", exact: true })
        .first()
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "처리 확정", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const approved = await service.api("/work/requests?scope=mine", {
        actor: "general-user",
      });
      assert.equal(
        approved.body.data.items.find((item) => item.id === submitted.id)
          .status,
        "approved"
      );
      await screenshot("after-workspace-request");
    }
  );
  await check(
    "six account classes open the correct work landing from actual server permissions",
    async () => {
      for (const [role, profile] of [
        ["general-user", "personal"],
        ["project-manager", "project"],
        ["branch-admin", "tenant"],
        ["security-manager", "security"],
        ["security-auditor", "audit"],
        ["portal-admin", "operations"],
      ]) {
        await login(role);
        await page.locator(".home-work-button").click();
        await expect(page.getByTestId("portal-work")).toHaveAttribute(
          "data-profile",
          profile
        );
        await expect(page.locator("main")).not.toContainText("집계 중 오류");
        await screenshot("after-role-" + role);
      }
    }
  );
  await check(
    "mobile profile, projects and four designs have no horizontal page overflow",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const route of [
        "/?design=aurora",
        "/my-page?tab=profile",
        "/my-page?tab=projects",
        "/my-page?tab=sessions",
        "/project-workspace",
        "/portal-work",
        "/credit-manager",
        "/admin-console",
        "/krmf-monitor",
      ]) {
        await goto(route);
        await page.waitForTimeout(150);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          route + " mobile overflow"
        );
        await screenshot(
          "mobile-" +
            (route === "/?design=aurora"
              ? "home"
              : route.slice(1).replaceAll(/[?=]/g, "-"))
        );
      }
      await goto("/");
      for (const [i, name] of [
        "Aurora",
        "Focus",
        "Orbit",
        "Canvas",
      ].entries()) {
        await page
          .getByRole("button", { name: `0${i + 1} ${name}`, exact: true })
          .click();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          name + " mobile overflow"
        );
      }
    }
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(service.apiErrors, []);
  await fs.writeFile(
    `${evidence}/customer-browser-tests.json`,
    JSON.stringify(
      {
        checks,
        errors,
        apiErrors: service.apiErrors,
        dataMode: "actual BFF + disposable local PostgreSQL; test auth only",
      },
      null,
      2
    )
  );
  console.log(`${checks.length} browser scenarios passed`);
} catch (error) {
  console.error("FAILED", error);
  if (page) await screenshot("failure");
  throw error;
} finally {
  await browser.close();
  await service.close();
}

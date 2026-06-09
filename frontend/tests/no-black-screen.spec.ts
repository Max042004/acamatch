import { expect, test, type Page } from "@playwright/test"

test("25-page PDF is analyzed in planned sections without blanking the app", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await mockExtract(page, 25)
  await mockIterate(page)

  await page.goto("/")
  await expect(page.getByText("Acamatch")).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: "大型招標案.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 mock"),
  })

  await expect(page.getByText("文件分析")).toBeVisible()
  await expect(page.getByText("大型招標案.pdf", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "文件大綱與分析計畫" })).toBeVisible()
  await expect(page.getByRole("button", { name: "段落 1" })).toBeVisible()
  await expect(page.getByRole("button", { name: "段落 2" })).toBeVisible()

  await expect(page.getByText(/已完成 段落 7/)).toBeVisible()
  await page.getByRole("button", { name: /段落 2/ }).click()
  await expect(page.getByText("本段分析完成")).toBeVisible()
  await expect(page.getByText("REQ req-1").first()).toBeVisible()
  await page.getByRole("heading", { name: "招標審查後台" }).click()
  await expect(page.getByText("招標書需求對應")).toBeVisible()
  await expect(page.getByText("來源：招標書第 3 頁：投標文件上傳與審查")).toBeVisible()

  await assertAppIsNotBlank(page)
  expect(pageErrors).toEqual([])
})

test("fallback PoC is rendered when AI finishes analysis without screens", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await mockExtract(page, 1)
  await page.route("**/api/iterate", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        spec: baseSpec({
          title: "無畫面回傳測試",
          assistant_message: "已完成需求分析，但沒有回傳 screens。",
          screens: [],
        }),
      }),
    })
  })

  await page.goto("/")
  await page.locator('input[type="file"]').setInputFiles({
    name: "無畫面招標案.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 mock"),
  })

  await expect(page.getByText("招標需求對應 PoC")).toBeVisible()
  await expect(page.getByText("REQ req-1").first()).toBeVisible()
  await expect(page.getByText("系統需支援招標文件上傳與審查").first()).toBeVisible()
  await assertAppIsNotBlank(page)
  expect(pageErrors).toEqual([])
})

test("malformed AI output is contained and does not turn into a black screen", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.route("**/api/iterate", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        spec: {
          title: "不規則輸出測試",
          one_liner: "測試 renderer 對不規則資料的容錯",
          assistant_message: "已處理不規則輸出。",
          workflow: "pre_sales",
          source_summary: "摘要",
          stakeholders: "not-array",
          business_process: null,
          requirements: null,
          open_questions: [{ id: "q1", question: "問題", options: "not-array" }],
          risks: [{ id: "r1", title: "風險", level: "unknown", detail: "未知風險" }],
          acceptance_criteria: [{ id: "a1", criterion: "驗收", status: "bad-status" }],
          proposal_materials: [{ id: "p1", title: "素材", content: "內容", type: "slide" }],
          wbs: [{ id: "w1", name: "工作", deliverable: "交付" }],
          screens: [
            {
              id: "s1",
              name: "異常 PoC",
              components: [
                { id: "c1", type: "table", props: { columns: "bad", rows: ["row-as-string"] } },
                { id: "c2", type: "steps", props: { items: "bad" } },
              ],
            },
          ],
        },
      }),
    })
  })

  await page.goto("/")
  await page.getByPlaceholder(/貼上標案文件/).fill("測試不規則 AI 輸出")
  await page.keyboard.press("Enter")

  await expect(page.getByText("測試 renderer 對不規則資料的容錯")).toBeVisible()
  await expect(page.getByText("異常 PoC")).toBeVisible()
  await assertAppIsNotBlank(page)
  expect(pageErrors).toEqual([])
})

async function mockExtract(page: Page, totalPages: number) {
  await page.route("**/api/extract", async (route) => {
    const pages = Array.from({ length: totalPages }, (_, index) => ({
      num: index + 1,
      text:
        `第 ${index + 1} 頁 招標內容。` +
        "需求包含投標文件、資格審查、服務水準、資安、驗收、報表、系統整合。".repeat(45),
    }))
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        filename: "大型招標案.pdf",
        mime: "application/pdf",
        text: pages.map((p) => p.text).join("\n\n"),
        pages,
      }),
    })
  })
}

async function mockIterate(page: Page) {
  let call = 0
  await page.route("**/api/iterate", async (route) => {
    call += 1
    const isOutline = call === 1
    const sectionIndex = Math.max(1, call - 1)
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        spec: {
          ...baseSpec({
            title: isOutline ? "大型招標案分析計畫" : `完成段落分析 ${sectionIndex}`,
            assistant_message: isOutline ? "已完成文件大綱，接著依段落分析。" : `已完成段落 ${sectionIndex}。`,
            source_summary: isOutline ? "先建立整份招標文件的大綱。" : `已整合段落 ${sectionIndex} 的需求。`,
          }),
        },
      }),
    })
  })
}

function baseSpec(overrides: Record<string, unknown> = {}) {
  return {
    title: "大型招標案分析計畫",
    one_liner: "長文件以大綱與段落順序逐步分析",
    assistant_message: "已完成分析。",
    workflow: "pre_sales",
    source_summary: "先建立整份招標文件的大綱。",
    stakeholders: ["採購單位", "投標廠商", "審查委員"],
    business_process: ["公告招標", "廠商投標", "資格審查", "驗收"],
    requirements: [
      {
        id: "req-1",
        statement: "系統需支援招標文件上傳與審查",
        status: "assumed",
        category: "functional",
        ambiguity: "medium",
        source: "招標書第 3 頁：投標文件上傳與審查",
        estimateImpact: "影響文件儲存與權限設計",
      },
    ],
    open_questions: [{ id: "q1", question: "是否需要多層簽核？", options: ["需要", "不需要"] }],
    risks: [{ id: "risk-1", title: "資安規格未定", level: "high", detail: "影響部署與成本" }],
    acceptance_criteria: [
      { id: "ac-1", reqRef: "req-1", criterion: "可上傳並審查投標文件", status: "assumed" },
    ],
    proposal_materials: [{ id: "pm-1", title: "提案摘要", content: "以分段方式降低長文件遺漏風險。", type: "slide" }],
    wbs: [{ id: "wbs-1", name: "需求分析", deliverable: "需求拆解表", effort: "M" }],
    screens: [
      {
        id: "screen-1",
        name: "招標審查後台",
        components: [
          { id: "c1", type: "heading", reqRef: "req-1", props: { text: "招標審查後台" } },
          {
            id: "c2",
            type: "table",
            reqRef: "req-1",
            props: { columns: ["標案", "廠商", "狀態"], rows: [["A 案", "甲公司", "待審"]] },
          },
        ],
      },
    ],
    ...overrides,
  }
}

async function assertAppIsNotBlank(page: Page) {
  const root = page.locator("#root")
  await expect(root).toBeVisible()
  await expect(root).not.toBeEmpty()
  await expect(page.getByText("Acamatch")).toBeVisible()
  const bodyColor = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)
  const rootTextLength = await root.evaluate((el) => el.textContent?.trim().length || 0)
  expect(rootTextLength).toBeGreaterThan(20)
  expect(bodyColor).not.toBe("rgb(0, 0, 0)")
}

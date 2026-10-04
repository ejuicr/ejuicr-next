import { expect, test, type Locator } from "@playwright/test";

test.describe("calculator", () => {
  test("recalculates and persists an input-only draft", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("targetAmountInput")).toHaveValue("30");

    await page.getByTestId("targetAmountInput").fill("45");

    // 6 mg/mL * 45 mL / 100 mg/mL = 2.7 mL of nicotine.
    await expect(page.getByText("2.7mL")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("targetAmountInput")).toHaveValue("45");

    const draft = await page.evaluate(
      () => JSON.parse(localStorage.getItem("calculator") ?? "null") as {
        version?: number;
        flavors?: Array<Record<string, unknown>>;
      },
    );
    expect(draft.version).toBe(2);
    expect(draft.flavors?.[0]).not.toHaveProperty("amount");
  });

  test("clamps flavor percentages to the valid range", async ({ page }) => {
    await page.goto("/");
    const percent = page.getByTestId("flavor1PercentInput");

    await percent.fill("150");
    await expect(percent).toHaveValue("100");
  });
});

test.describe("layout and accessibility", () => {
  test("uses the display font and a full-width content column", async ({
    page,
  }) => {
    await page.goto("/");

    const font = await page
      .locator("h2")
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(font).toContain("Bebas Neue");

    const mainWidth = await page
      .locator("main")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(mainWidth).toBeGreaterThan(700);
  });

  test("matches the legacy section-heading spacing and alignment", async ({
    page,
  }) => {
    await page.goto("/help");
    const section = page.getByRole("heading", { name: "Contact Support" });
    const sectionStyles = await section.evaluate((element) => {
      const cs = getComputedStyle(element);
      const paragraph = element.closest("main")!.querySelector("p")!;
      return {
        marginTop: cs.marginTop,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        alignedWithParagraph:
          Math.round(element.getBoundingClientRect().left) ===
          Math.round(paragraph.getBoundingClientRect().left),
      };
    });
    expect(sectionStyles).toEqual({
      marginTop: "70px",
      lineHeight: "normal",
      fontWeight: "700",
      alignedWithParagraph: true,
    });

    await page.goto("/");
    const calculatorSection = page.getByRole("heading", {
      name: "Ingredients",
    });
    const calculatorStyles = await calculatorSection.evaluate((element) => ({
      marginTop: getComputedStyle(element).marginTop,
      lineHeight: getComputedStyle(element).lineHeight,
    }));
    expect(calculatorStyles).toEqual({
      marginTop: "36px",
      lineHeight: "normal",
    });

    const labelWeight = await page
      .locator("h5")
      .first()
      .evaluate((element) => getComputedStyle(element).fontWeight);
    expect(labelWeight).toBe("700");
  });

  test("centers the header logo and suppresses focus outlines", async ({
    page,
  }) => {
    await page.goto("/");

    const headerMetrics = await page
      .locator("#page-header")
      .evaluate((header) => {
        const headerRect = header.getBoundingClientRect();
        const image = header.querySelector("img")!;
        const imageRect = image.getBoundingClientRect();
        return {
          top: Math.round(imageRect.top - headerRect.top),
          bottom: Math.round(headerRect.bottom - imageRect.bottom),
        };
      });
    expect(headerMetrics.top).toBe(headerMetrics.bottom);

    const buttonOutline = await page
      .getByRole("button", { name: "Open menu" })
      .evaluate((element) => {
        (element as HTMLElement).focus();
        return getComputedStyle(element).outlineStyle;
      });
    expect(buttonOutline).toBe("none");

    const inputOutline = await page
      .getByTestId("targetAmountInput")
      .evaluate((element) => {
        (element as HTMLInputElement).focus();
        return getComputedStyle(element).outlineStyle;
      });
    expect(inputOutline).toBe("none");
  });

  test("shows the focus gradient on keyboard focus", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const logo = page.locator("#page-header").getByLabel("ejuicr home");
    await expect(logo).toBeFocused();
    expect(
      await logo.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      ),
    ).toContain("linear-gradient");

    await page.keyboard.press("Tab");
    const menu = page.getByRole("button", { name: "Open menu" });
    await expect(menu).toBeFocused();
    expect(
      await menu.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      ),
    ).toContain("linear-gradient");
  });

  test("keeps the closed sidebar inert and restores focus after Escape", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Main menu"]');
    await expect(nav).toHaveAttribute("inert", "");

    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    await expect(nav).not.toHaveAttribute("inert", "");
    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(nav).toHaveAttribute("inert", "");
    await expect(menuButton).toBeFocused();
  });

  test("labels auth inputs and restores list markers", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await nav.getByRole("link", { name: "Login/Signup" }).click();
    await nav.getByRole("button", { name: "Sign in with Email" }).click();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto("/privacy-policy");
    const listStyle = await page
      .locator("ol")
      .first()
      .evaluate((element) => getComputedStyle(element).listStyleType);
    expect(listStyle).toBe("decimal");
  });

  test("keeps flavor-row spacing and input borders matching the design", async ({
    page,
  }) => {
    await page.goto("/");

    // Gradient borders are symmetric around the input.
    const border = await page
      .getByTestId("flavor1NameInput")
      .locator("xpath=..")
      .evaluate((element) => {
        const input = element.querySelector("input");
        if (!input) throw new Error("input missing");
        const wrapperRect = element.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        return {
          top: inputRect.top - wrapperRect.top,
          bottom: wrapperRect.bottom - inputRect.bottom,
          height: wrapperRect.height,
        };
      });
    expect(Math.abs(border.top - border.bottom)).toBeLessThan(0.5);
    expect(border.height).toBeCloseTo(35, 0);

    // The controls cell is right-aligned in its track, delete at the edge.
    const row = page.locator(".row.flavor").first();
    const rowBox = await row.boundingBox();
    const cellBox = await row.locator(":scope > div").last().boundingBox();
    if (!rowBox || !cellBox) throw new Error("flavor row missing");
    expect(
      Math.abs(rowBox.x + rowBox.width - 8 - (cellBox.x + cellBox.width)),
    ).toBeLessThan(1);

    // Delete is red in its static state (no gradient background image).
    const deleteButton = page.getByTestId("flavor1DeleteBtn");
    const addFlavorButton = page.getByRole("button", { name: "Add Flavor" });
    const readBackground = (locator: Locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return `${style.backgroundColor} ${style.backgroundImage}`;
      });
    const deleteStyle = await deleteButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        image: style.backgroundImage,
      };
    });
    expect(deleteStyle.background).toBe("rgb(255, 85, 85)");
    expect(deleteStyle.image).toBe("none");

    // Delete shares the standard hover/active background with other buttons.
    // hover() scrolls each button into view; release the pressed mouse away
    // from the button so no click handler ever fires.
    await deleteButton.hover();
    const deleteHover = await readBackground(deleteButton);
    await addFlavorButton.hover();
    const addFlavorHover = await readBackground(addFlavorButton);
    expect(deleteHover).toBe(addFlavorHover);

    await deleteButton.hover();
    await page.mouse.down();
    const deleteActive = await readBackground(deleteButton);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await addFlavorButton.hover();
    await page.mouse.down();
    const addFlavorActive = await readBackground(addFlavorButton);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    expect(deleteActive).toBe(addFlavorActive);

    // Buttons and the bordered inputs are 35px tall.
    const addFlavorHeight = await page
      .getByRole("button", { name: "Add Flavor" })
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(addFlavorHeight).toBeCloseTo(35, 0);

    // Button contents are vertically centered.
    const centered = await page
      .getByRole("button", { name: "Add Flavor" })
      .evaluate((element) => {
        const buttonRect = element.getBoundingClientRect();
        const buttonCenter = buttonRect.top + buttonRect.height / 2;
        return [...element.children].every((child) => {
          const rect = child.getBoundingClientRect();
          return Math.abs(rect.top + rect.height / 2 - buttonCenter) < 1;
        });
      });
    expect(centered).toBe(true);

    for (const testId of ["targetPgInput", "flavor1NameInput"]) {
      const wrapperHeight = await page
        .getByTestId(testId)
        .locator("xpath=..")
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(wrapperHeight).toBeCloseTo(35, 0);
    }

    // The nicotine config panel rule has no vertical margin.
    await page.getByTestId("nicConfigBtn").click();
    const marginTop = await page
      .locator(".config-wrapper > hr")
      .first()
      .evaluate((element) => getComputedStyle(element).marginTop);
    expect(marginTop).toBe("0px");
  });

  test("keeps the footer at the bottom on short pages", async ({ page }) => {
    await page.goto("/no-such-page");

    const [footerBottom, viewportHeight] = await page.evaluate(() => [
      document.querySelector("footer")?.getBoundingClientRect().bottom ?? 0,
      window.innerHeight,
    ]);
    expect(Math.round(footerBottom)).toBe(viewportHeight);
  });
});

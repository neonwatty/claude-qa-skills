import { describe, it, expect } from "vitest";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "child_process";

const root = process.cwd();

describe("installed sign-in script smoke test", () => {
  it("runs from an installed auth directory and manages custom sites", () => {
    const installDir = mkdtempSync(join(tmpdir(), "playwright-profiles-install-"));
    const authHome = mkdtempSync(join(tmpdir(), "playwright-profiles-auth-"));
    mkdirSync(installDir, { recursive: true });

    copyFileSync(
      join(root, "skills/auth-browse/scripts/sign-in.mjs"),
      join(installDir, "sign-in.mjs"),
    );
    copyFileSync(
      join(root, "skills/auth-browse/scripts/cookie-analysis.mjs"),
      join(installDir, "cookie-analysis.mjs"),
    );

    const env = { ...process.env, PLAYWRIGHT_CLI_HOME: authHome };
    const listOutput = execFileSync("node", [join(installDir, "sign-in.mjs"), "list"], {
      encoding: "utf8",
      env,
    });
    expect(listOutput).toContain("github");
    expect(listOutput).toContain("cloudflare");

    execFileSync(
      "node",
      [
        join(installDir, "sign-in.mjs"),
        "add",
        "myapp",
        "https://example.com/login",
        "/dashboard",
      ],
      { encoding: "utf8", env },
    );

    const sitesFile = join(authHome, "sites.json");
    expect(existsSync(sitesFile)).toBe(true);
    const sites = JSON.parse(readFileSync(sitesFile, "utf8"));
    expect(sites.myapp).toEqual({
      url: "https://example.com/login",
      waitFor: "/dashboard",
    });

    const checkOutput = execFileSync(
      "node",
      [join(installDir, "sign-in.mjs"), "check", "myapp"],
      { encoding: "utf8", env },
    );
    expect(checkOutput).toContain("no saved auth");
  });
});

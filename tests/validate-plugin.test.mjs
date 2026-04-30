import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function entries(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe("plugin repository integrity", () => {
  it("has valid plugin metadata pointing at the skills directory", () => {
    const plugin = readJson(".claude-plugin/plugin.json");

    expect(plugin.name).toBe("qa-skills");
    expect(plugin.skills).toBe("./skills");
    expect(existsSync(join(root, plugin.skills))).toBe(true);
  });

  it("has a SKILL.md for every skill directory", () => {
    for (const skill of entries("skills")) {
      expect(
        existsSync(join(root, "skills", skill, "SKILL.md")),
        `${skill} is missing SKILL.md`,
      ).toBe(true);
    }
  });

  it("has frontmatter for every command file", () => {
    const commands = readdirSync(join(root, "commands"))
      .filter((name) => name.endsWith(".md"))
      .sort();

    expect(commands).toContain("setup-profiles.md");
    expect(commands).toContain("setup-auth-browse.md");
    expect(commands).toContain("run-qa.md");

    for (const command of commands) {
      const content = readFileSync(join(root, "commands", command), "utf8");
      expect(content.startsWith("---\n"), `${command} missing frontmatter`).toBe(
        true,
      );
      expect(content).toMatch(/^description:/m);
      expect(content).toMatch(/^allowed-tools:/m);
    }
  });

  it("bundles auth-browse runtime scripts next to the skill", () => {
    const scripts = [
      "skills/auth-browse/scripts/sign-in.mjs",
      "skills/auth-browse/scripts/cookie-analysis.mjs",
    ];

    for (const script of scripts) {
      expect(existsSync(join(root, script)), `${script} is missing`).toBe(true);
    }
  });

  it("keeps auth-only skills available in the QA plugin", () => {
    const skills = entries("skills");

    expect(skills).toContain("use-profiles");
    expect(skills).toContain("auth-browse");
    expect(skills).toContain("capture-auth");
  });
});

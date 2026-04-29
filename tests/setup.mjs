import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

process.env.PLAYWRIGHT_CLI_HOME = mkdtempSync(
  join(tmpdir(), "playwright-profiles-cli-"),
);

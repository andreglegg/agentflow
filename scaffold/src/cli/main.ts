#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";
import { runLint } from "./commands/lint.js";

const program = new Command();

program
  .name("agentflow")
  .description("Compile .afx agent source files into LLM project instruction files.")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize AgentFlow in this project and build the default targets.")
  .option("--force", "Overwrite an existing project.afx")
  .action((opts: { force?: boolean }) => {
    process.exit(runInit({ force: opts.force ?? false }));
  });

program
  .command("build")
  .description("Compile AgentFlow source files into target outputs.")
  .option("--claude-import", "Emit CLAUDE.md as a thin @import of AGENTS.md")
  .action((opts: { claudeImport?: boolean }) => {
    process.exit(runBuild({ claudeImport: opts.claudeImport ?? false }));
  });

program
  .command("check")
  .description("Fail if generated files are stale (for CI).")
  .action(() => {
    process.exit(runCheck());
  });

program
  .command("validate")
  .description("Validate AgentFlow source files and report diagnostics.")
  .action(() => {
    process.exit(runValidate());
  });

program
  .command("inspect")
  .description("Print the normalized IR (or the AST with --ast).")
  .option("--ast", "Print the parsed AST instead of the IR")
  .action((opts: { ast?: boolean }) => {
    process.exit(runInspect({ ast: opts.ast ?? false }));
  });

program
  .command("lint")
  .description("Lint AgentFlow source for quality, bloat, and conflicts.")
  .option("--strict", "Treat lint findings as errors (nonzero exit)")
  .action((opts: { strict?: boolean }) => {
    process.exit(runLint({ strict: opts.strict ?? false }));
  });

program.parse(process.argv);

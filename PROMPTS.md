# Universal Two-Shot Prompts

These are the **exact two prompts** you will use for every experiment. Copy them verbatim into the GitHub Copilot agent session.

## Prompt 1 (Planning Phase – Halt After Creation)
You are now beginning work as the autonomous expert software engineer for this repository, operating strictly under the Project Constitution located in CONSTITUTION.md.

This is Prompt 1 of exactly two prompts.

First, read and fully internalize:
- CONSTITUTION.md (the complete governing document)
- PROJECT-SPEC.md (the detailed project requirements and success criteria for this specific project)

If you believe any updates to the constitution are necessary or beneficial for maximum quality and success, propose them clearly in a new section titled "Constitution Updates Proposed in Prompt 1" inside your response. Any approved updates will become part of the living constitution.

Then, create the following files in the repository (do not create any other files or begin implementation yet):

1. IMPLEMENTATION-PLAN.md — a complete, detailed, step-by-step implementation plan that covers the entire project from start to finish. The plan must be realistic, thorough, and broken into clear, atomic, sequential (and where possible parallel) tasks. Include architecture decisions, tech stack choices, testing strategy, deployment configuration, and any risks/mitigations. Reference the Project Spec and Constitution explicitly where relevant.

2. PROGRESS.md — an initial live status dashboard showing 0% complete, with sections for completed tasks (currently empty), in-progress tasks, open blockers, and next actions.

3. CHANGELOG.md — initialized with an entry for this planning phase (include date and summary of actions taken in Prompt 1).

4. Any additional scaffolding or support documents you determine are immediately necessary for successful execution.

After creating and committing these planning artifacts, **halt completely**. Do not write any code, do not create source files, do not begin implementation, do not run any builds or tests. Output a clear message at the very end of your response that says:

"Planning phase complete. Awaiting explicit authorization via Prompt 2 to begin full autonomous execution of the implementation plan."

You have maximum flexibility to revise or expand the implementation plan later if better approaches emerge — document any such changes transparently in CHANGELOG.md and PROGRESS.md.

Remember:
- There are no time budgets or iteration limits. Take whatever time and iterations are needed for excellence.
- Stay strictly within all Hard Boundaries in the Constitution (zero external costs, GitHub sandbox only, no manual follow-up required).
- Prioritize real-world usefulness, visual polish, depth, factual integrity, and professional quality.

This is the end of Prompt 1. Do not proceed to execution until you receive Prompt 2.

## Prompt 2 (Full Autonomous Execution)
You are now continuing work as the autonomous expert software engineer for this repository, operating strictly under the Project Constitution located in CONSTITUTION.md (including any updates you proposed and recorded in Prompt 1).

This is Prompt 2 of exactly two prompts.

You now have **explicit, full authorization** to execute the entire implementation plan you created in IMPLEMENTATION-PLAN.md.

Proceed autonomously and without any further human input or authorization. Execute the plan from start to finish, making frequent atomic commits, updating PROGRESS.md and CHANGELOG.md in real time, and leveraging GitHub’s built-in Copilot Memory feature where helpful.

You have maximum flexibility:
- Revise, expand, or rewrite any part of the implementation plan if you discover better approaches, missing elements, or opportunities for higher quality.
- Add, remove, rename, or reorganize any files or folders as needed.
- Update this constitution or any other document if it improves the final result.

Document every significant change transparently in CHANGELOG.md and keep PROGRESS.md current as a live status dashboard.

Remember the hard boundaries at all times:
- Zero external costs
- GitHub sandbox only
- Final product must be 100% functional with zero manual setup required from the user
- Everything must work out-of-the-box via GitHub Pages and GitHub Actions

There are no time budgets, deadlines, or iteration limits. Take as much time and as many iterations as needed to achieve excellence. Iterate thoroughly, self-correct, test rigorously, and polish until every Quality Gate in the Constitution is fully satisfied.

When the project is complete:
- All automated tests must pass
- GitHub Pages deployment must be live and fully interactive
- Documentation (especially README.md) must be professional and complete
- The project must meet or exceed every success criterion in PROJECT-SPEC.md and the Constitution

Once every Quality Gate is satisfied and you have verified the live GitHub Pages deployment works perfectly, output a final clear message at the very end of your response that says:

"Project complete. All quality gates satisfied. Repository is ready for use. No further action required from the user."

Do not stop or ask for input at any point unless you encounter a true critical error that genuinely cannot be resolved inside the GitHub sandbox and requires human intervention. Any such stop will be treated as failure of the two-shot rule.

This is the end of Prompt 2. Begin full autonomous execution immediately.
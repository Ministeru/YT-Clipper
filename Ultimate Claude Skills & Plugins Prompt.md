# **The Ultimate Claude Skills & Plugins Prompt**

## **PART 1 — WHAT IS A SKILL? (Core Mental Model)**

A **skill** is a folder that teaches Claude how to handle specific tasks reliably, every time, without re-explaining yourself.

your-skill-name/  
├── SKILL.md          ← REQUIRED. The brain of the skill.  
├── scripts/          ← Optional. Executable Python/Bash code.  
├── references/       ← Optional. Docs Claude loads when needed.  
└── assets/           ← Optional. Templates, fonts, icons.

**Three-level progressive disclosure** (how Claude loads skills):

| Level | What | When Loaded | Token Cost |
| ----- | ----- | ----- | ----- |
| 1 | YAML frontmatter (name \+ description) | Always, every conversation | \~100 words |
| 2 | SKILL.md body (full instructions) | When Claude decides skill is relevant | \< 500 lines ideal |
| 3 | Bundled files in scripts/ references/ assets/ | Only when explicitly needed | Unlimited |

**Key insight:** Claude decides whether to load a skill based ONLY on the description in the YAML frontmatter. Your description is the most important thing you'll write.

---

## **PART 2 — THE YAML FRONTMATTER (Master This First)**

### **Minimal valid format**

\---  
name: your-skill-name  
description: What it does. Use when user asks to \[specific phrases\].  
\---

### **Full format with all optional fields**

\---  
name: your-skill-name  
description: \>  
  Detailed explanation of what this skill does and when to use it.  
  Include specific trigger phrases users might say. Mention file  
  types if relevant. Under 1024 characters total.  
license: MIT  
compatibility: Requires Python 3.10+, network access to Notion API  
metadata:  
  author: Your Name or Company  
  version: 1.0.0  
  mcp-server: your-mcp-server-name  
  category: productivity  
  tags: \[project-management, automation\]  
  documentation: https://example.com/docs  
  support: support@example.com  
\---

### **Field rules — memorize these**

**`name` field:**

* ✅ `kebab-case` only  
* ✅ Must match your folder name  
* ❌ No spaces: `My Cool Skill`  
* ❌ No underscores: `my_cool_skill`  
* ❌ No capitals: `MyCoolSkill`  
* ❌ Cannot start with `claude` or `anthropic` (reserved)

**`description` field:**

* ✅ Must include WHAT the skill does AND WHEN to use it  
* ✅ Include specific phrases users might actually say  
* ✅ Mention file types if relevant (`.pdf`, `.fig`, `.csv`)  
* ✅ Be a little "pushy" — Claude tends to undertrigger, so lean toward explicit  
* ❌ No XML angle brackets `< >` anywhere  
* ❌ Max 1024 characters

**Security rule:** Never put `< >` angle brackets in frontmatter. The frontmatter lives in Claude's system prompt and can be exploited.

---

## **PART 3 — WRITING GREAT DESCRIPTIONS (The \#1 Skill)**

### **The formula**

\[What it does\] \+ \[When to use it\] \+ \[Specific trigger phrases\] \+ \[File types if relevant\]

### **Good description examples ✅**

\# Clear, specific, includes trigger phrases  
description: \>  
  Analyzes Figma design files and generates developer handoff documentation.  
  Use when user uploads .fig files, asks for "design specs", "component  
  documentation", or "design-to-code handoff". Always use this skill when  
  any Figma file is mentioned.

\# Outcome-focused with explicit triggers  
description: \>  
  End-to-end customer onboarding for PayFlow. Handles account creation,  
  payment setup, and subscription management. Use when user says "onboard  
  new customer", "set up subscription", "create PayFlow account", or  
  mentions new client setup.

\# With negative triggers to prevent overtriggering  
description: \>  
  Advanced statistical analysis for CSV data including regression, clustering,  
  and modeling. Use for statistical modeling tasks. Do NOT use for simple  
  data exploration or basic charts (use the data-viz skill instead).

### **Bad description examples ❌**

\# Too vague — won't trigger  
description: Helps with projects.

\# Missing trigger phrases — Claude won't know when to use it  
description: Creates sophisticated multi-page documentation systems.

\# Too technical, no user-facing language  
description: Implements the Project entity model with hierarchical relationships.

### **Debugging trigger issues**

Ask Claude directly: *"When would you use the \[skill name\] skill?"*  
 Claude will quote the description back. If it sounds vague or unclear to you, it's unclear to Claude.

---

## **PART 4 — WRITING THE SKILL.MD BODY**

### **Recommended structure template**

\---  
name: your-skill-name  
description: \[Your optimized description\]  
\---

\# Skill Name

Brief one-line summary of what this skill does.

\#\# When to Use This Skill  
\- List of specific trigger scenarios  
\- File types or contexts that apply

\#\# Step 1: \[First Action\]

What happens here. Be specific and actionable.

\`\`\`bash  
\# Example command or code  
python scripts/process.py \--input {filename}  
\# Expected output: describe what success looks like

## **Step 2: \[Second Action\]**

Continue with clear steps...

## **Examples**

### **Example 1: \[Common scenario\]**

**User says:** "Set up a new marketing campaign"  
 **Actions:**

1. Fetch existing campaigns via MCP  
2. Create campaign with provided parameters  
    **Result:** Campaign created with confirmation link

## **Troubleshooting**

### **Error: \[Common error message\]**

**Cause:** Why it happens  
 **Solution:** How to fix it

## **Quality Checklist**

Before finishing, verify:

* \[ \] Step 1 completed successfully  
* \[ \] Output validated  
* \[ \] User notified of result

\#\#\# Writing instructions that Claude actually follows

\*\*Be specific and actionable:\*\*  
\`\`\`markdown  
\# ✅ Good  
Run \`python scripts/validate.py \--input {filename}\` to check data format.  
If validation fails, common issues include:  
\- Missing required fields (add them to the CSV)  
\- Invalid date formats (use YYYY-MM-DD)

\# ❌ Bad  
Validate the data before proceeding.

**For critical steps, use explicit headers:**

\#\# CRITICAL: Before calling create\_project, verify:  
\- Project name is non-empty  
\- At least one team member assigned  
\- Start date is not in the past

**Add performance encouragement for complex tasks:**

\#\# Performance Notes  
\- Take your time to do this thoroughly  
\- Quality matters more than speed  
\- Do not skip validation steps

**Use progressive disclosure — keep SKILL.md focused, reference files for depth:**

Before writing queries, consult \`references/api-patterns.md\` for:  
\- Rate limiting guidance  
\- Pagination patterns  
\- Error codes and handling

---

## **PART 5 — THE 5 PATTERNS THAT WORK**

### **Pattern 1: Sequential Workflow Orchestration**

*Use when:* Users need multi-step processes in a specific order.

\# Workflow: Onboard New Customer

\#\# Step 1: Create Account  
Call MCP tool: \`create\_customer\`  
Parameters: name, email, company  
Expected: customer\_id returned

\#\# Step 2: Setup Payment  
Call MCP tool: \`setup\_payment\_method\`  
Wait for: payment method verification

\#\# Step 3: Create Subscription  
Call MCP tool: \`create\_subscription\`  
Use customer\_id from Step 1

\#\# Step 4: Send Welcome Email  
Call MCP tool: \`send\_email\`  
Template: welcome\_email\_template

\#\# If any step fails:  
\- Log the error  
\- Notify user of which step failed  
\- Provide manual recovery instructions

### **Pattern 2: Multi-MCP Coordination**

*Use when:* Workflows span multiple services.

\# Phase 1: Figma MCP — Export design assets  
\# Phase 2: Drive MCP — Store assets, generate links  
\# Phase 3: Linear MCP — Create dev tasks with asset links  
\# Phase 4: Slack MCP — Post handoff summary to \#engineering

\#\# Data passing between phases:  
\- Phase 1 → Phase 2: asset list  
\- Phase 2 → Phase 3: shareable URLs  
\- Phase 3 → Phase 4: task references

### **Pattern 3: Iterative Refinement**

*Use when:* Output quality improves with iteration (reports, documents, designs).

\#\# Initial Draft  
1\. Fetch data via MCP  
2\. Generate first draft  
3\. Save to temp file

\#\# Quality Check  
Run: \`python scripts/check\_report.py\`  
Check for: missing sections, formatting issues, data errors

\#\# Refinement Loop  
1\. Fix each identified issue  
2\. Re-validate  
3\. Repeat until quality threshold met

\#\# Finalization  
Apply formatting, generate summary, save final version

### **Pattern 4: Context-Aware Tool Selection**

*Use when:* Same goal, different tools depending on context.

\#\# Decision Tree: File Storage  
1\. Check file type and size  
2\. Route accordingly:  
   \- Large files (\>10MB) → cloud storage MCP  
   \- Collaborative docs → Notion/Docs MCP  
   \- Code files → GitHub MCP  
   \- Temp files → local storage  
3\. Always explain to user WHY that storage was chosen

### **Pattern 5: Domain-Specific Intelligence**

*Use when:* Your skill embeds specialized knowledge (compliance, legal, finance).

\#\# Payment Processing with Compliance

\#\#\# Before Processing (Run Every Time)  
1\. Check sanctions lists  
2\. Verify jurisdiction allowances  
3\. Assess risk level  
4\. Document compliance decision

\#\#\# Processing (Only If Compliance Passed)  
\- Call payment processing MCP  
\- Apply fraud checks  
\- Process transaction

\#\#\# If Compliance Failed  
\- Flag for review  
\- Create compliance case  
\- Do NOT process

\#\#\# Audit Trail (Required)  
Log all checks, decisions, and results

---

## **PART 6 — SKILLS \+ MCP (The Power Combo)**

### **The kitchen analogy**

* **MCP** \= Professional kitchen (tools, ingredients, access)  
* **Skills** \= Recipes (how to use everything effectively)

### **Without skills \+ MCP:**

* Users connect your MCP but don't know what to do next  
* Each conversation starts from scratch  
* Inconsistent results because users prompt differently  
* Support tickets asking "how do I do X?"

### **With skills \+ MCP:**

* Pre-built workflows activate automatically  
* Best practices embedded in every interaction  
* Lower learning curve, consistent results

### **MCP connection troubleshooting checklist:**

1. Verify MCP server shows "Connected" in Settings → Extensions  
2. Confirm API keys are valid and not expired  
3. Check OAuth tokens are refreshed  
4. Test MCP independently: *"Use \[Service\] MCP to fetch my projects"*  
5. If direct MCP call fails → issue is in MCP, not your skill  
6. Verify tool names match exactly (case-sensitive)

---

## **PART 7 — TESTING YOUR SKILL**

### **Three levels of testing**

| Level | Method | Best For |
| ----- | ----- | ----- |
| Quick | Manual testing in Claude.ai | Fast iteration, no setup |
| Moderate | Scripted testing in Claude Code | Repeatable validation |
| Rigorous | Programmatic eval via API | Production-grade skills |

### **The 3 test categories**

**1\. Trigger tests** — Does it load at the right times?

✅ Should trigger:  
\- "Help me set up a new ProjectHub workspace"  
\- "I need to create a project in ProjectHub"  
\- "Initialize a ProjectHub project for Q4 planning"

❌ Should NOT trigger:  
\- "What's the weather in San Francisco?"  
\- "Help me write Python code"  
\- "Create a spreadsheet" (unless your skill handles sheets)

**2\. Functional tests** — Does it produce correct output?

Test: Create project with 5 tasks  
Given: Project name "Q4 Planning", 5 task descriptions  
When: Skill executes  
Then:  
  \- Project created  
  \- 5 tasks created with correct properties  
  \- All tasks linked to project  
  \- Zero API errors

**3\. Performance comparison** — Is it better than no skill?

Without skill:          With skill:  
15 back-and-forth       2 clarifying questions  
3 failed API calls      0 failed API calls  
12,000 tokens           6,000 tokens  
User types steps        Automatic workflow

### **Pro tip: Iterate on ONE hard task first**

Find the most challenging, representative task. Iterate until Claude nails it. Extract that winning approach into the skill. Then expand to multiple test cases.

---

## **PART 8 — TROUBLESHOOTING GUIDE**

### **Skill won't upload**

| Error | Cause | Fix |
| ----- | ----- | ----- |
| "Could not find SKILL.md" | Wrong filename | Must be exactly `SKILL.md` (case-sensitive) |
| "Invalid frontmatter" | YAML formatting issue | Add `---` delimiters above and below |
| "Invalid skill name" | Has spaces or capitals | Use `kebab-case` only |

**Valid YAML frontmatter:**

\---  
name: my-skill  
description: Does things clearly and specifically.  
\---

### **Skill doesn't trigger (undertriggering)**

**Checklist:**

* Is description too generic? ("Helps with projects" won't work)  
* Does it include phrases users would actually say?  
* Does it mention file types if relevant?

**Fix:** Add more specific trigger phrases. Make description more "pushy."

### **Skill triggers too much (overtriggering)**

**Fix 1:** Add negative triggers

description: \>  
  Advanced data analysis for CSV files. Use for statistical modeling.  
  Do NOT use for simple data exploration (use data-viz skill instead).

**Fix 2:** Narrow the scope

\# Too broad:  
description: Processes documents

\# Better:  
description: Processes PDF legal documents for contract review

### **Instructions not followed**

1. **Too verbose?** Move detailed content to `references/` files  
2. **Critical step buried?** Put it at the TOP with a `## CRITICAL:` header  
3. **Ambiguous language?** Replace "make sure to validate things" with exact commands  
4. **Model skipping steps?** Consider bundling a validation script — code is deterministic, language isn't

### **Skill is slow or responses degraded**

* Keep SKILL.md under 5,000 words (ideally under 500 lines)  
* Move long docs to `references/` and link to them  
* Avoid enabling more than 20-50 skills simultaneously  
* Use progressive disclosure — not everything in one file

---

## **PART 9 — DISTRIBUTION CHECKLIST**

### **GitHub hosting (recommended)**

1. Create public repo: `github.com/yourcompany/skills`  
2. Add repo-level `README.md` (for human visitors — NOT inside skill folder)  
3. Include screenshots and example usage  
4. Link from your MCP documentation

### **Installation guide template for users**

\# Installing the \[Your Service\] Skill

1\. \*\*Download:\*\*  
   \- Clone: \`git clone https://github.com/yourcompany/skills\`  
   \- Or download ZIP from Releases

2\. \*\*Install in Claude:\*\*  
   \- Open Claude.ai → Settings → Capabilities → Skills  
   \- Click "Upload skill"  
   \- Select the skill folder (zipped)

3\. \*\*Enable:\*\*  
   \- Toggle on the \[Your Service\] skill  
   \- Ensure your MCP server is connected

4\. \*\*Test:\*\*  
   \- Ask Claude: "Set up a new project in \[Your Service\]"

### **Positioning your skill (copy this framing)**

❌ Bad:

"The skill is a folder containing YAML frontmatter and Markdown instructions."

✅ Good:

"The ProjectHub skill enables teams to set up complete project workspaces in seconds — including pages, databases, and templates — instead of spending 30 minutes on manual setup."

---

## **PART 10 — COMPLETE VALIDATION CHECKLIST**

Use before AND after upload.

### **Before you start**

* \[ \] Identified 2–3 concrete use cases  
* \[ \] Identified required tools (built-in or MCP)  
* \[ \] Planned folder structure

### **During development**

* \[ \] Folder named in `kebab-case`  
* \[ \] `SKILL.md` exists (exact spelling, case-sensitive)  
* \[ \] YAML frontmatter has `---` delimiters  
* \[ \] `name` field: kebab-case, no spaces, no capitals  
* \[ \] `description` includes WHAT and WHEN  
* \[ \] No XML angle brackets `< >` anywhere in frontmatter  
* \[ \] Instructions are clear and actionable  
* \[ \] Error handling included for common failures  
* \[ \] Examples provided with realistic scenarios  
* \[ \] References clearly linked from SKILL.md

### **Before upload**

* \[ \] Skill triggers on obvious related tasks  
* \[ \] Skill triggers on paraphrased requests  
* \[ \] Skill does NOT trigger on unrelated topics  
* \[ \] Functional tests pass  
* \[ \] MCP integration works (if applicable)  
* \[ \] Compressed as `.zip` file

### **After upload**

* \[ \] Test in real conversations  
* \[ \] Monitor for under/over-triggering  
* \[ \] Collect user feedback  
* \[ \] Update `version` in metadata when iterating

---

## **PART 11 — QUICK REFERENCE PROMPTS TO USE WITH CLAUDE**

Use these prompts in your Claude conversations to leverage skills effectively:

**Build a skill from scratch:**

Use the skill-creator skill to help me build a skill for \[your use case\].  
My top 2-3 workflows are: \[list them\].

**Review and improve an existing skill:**

Review this skill and suggest improvements to make it trigger more reliably:  
\[paste your SKILL.md\]

**Debug triggering issues:**

When would you use the \[skill name\] skill?   
What phrases would make you load it automatically?

**Fix overtriggering:**

The \[skill name\] skill is loading for unrelated queries.  
Help me add negative triggers to make it more specific.

**Improve instructions:**

My skill loads correctly but Claude isn't following the instructions.  
Help me rewrite these steps to be more explicit and actionable:  
\[paste instructions\]

**Test a skill manually:**

Pretend you have access to the \[skill name\] skill.   
Follow its instructions to complete this task: \[task description\]

---

## **BONUS — SKILL STRUCTURE CHEAT SHEET**

✅ CORRECT folder name:    notion-project-setup  
❌ WRONG — has spaces:     Notion Project Setup  
❌ WRONG — underscores:    notion\_project\_setup  
❌ WRONG — capitals:       NotionProjectSetup

✅ CORRECT file name:      SKILL.md  
❌ WRONG — lowercase:      skill.md  
❌ WRONG — variation:      SKILL.MD

✅ CORRECT description:    Includes WHAT \+ WHEN \+ trigger phrases  
❌ WRONG description:      Too vague, missing trigger phrases

✅ DO include in repo:     README.md (for human visitors)  
❌ DON'T include in skill: README.md (inside skill folder)

✅ Progressive disclosure: Short SKILL.md \+ references/ for deep docs  
❌ Dump everything:        One giant SKILL.md with 10,000 words

✅ Test three things:      Triggering \+ Functionality \+ Performance  
❌ Ship without testing:   No trigger tests \= unpredictable behavior  

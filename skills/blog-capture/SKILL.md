---
name: blog-capture
description: Captures blog-worthy moments mid-project with screenshots, code snippets, and an interview process to extract insights. Creates a PR to your blog repo with a structured outline and assets. Use when you say "blog this", "capture for blog", "I want to write about this", or "blog capture".
---

# Blog Capture Skill

You are helping someone capture a blog-worthy moment from a project they're actively working on. Your job is to guide them through a focused session that ends with a PR to their blog repo containing a structured outline, captured assets (screenshots, code), and SEO-optimized metadata.

**Core insight:** The best time to capture blog-worthy moments is when they're happening, not after the context fades.

## The Flow

```
1. ORIENT     → Quick questions to understand what's interesting
2. CAPTURE    → Screenshots, code snippets from the current project
3. INTERVIEW  → Draw out the insight with probing questions
4. SEO        → Research keywords, optimize title/excerpt/tags
5. DRAFT      → Generate structured outline
6. ITERATE    → Show draft, get feedback, refine until approved
7. PACKAGE    → Create PR to blog repo
```

## Phase 1: Orient

Start by understanding the context. Use AskUserQuestion:

```
Questions to ask:
1. "What are you working on right now?" (project name/description)
2. "What made this moment interesting enough to blog about?"
3. "What's currently running that I should capture?" (browser app, iOS Sim, terminal, or just code)
```

Based on answers, determine:
- **Project directory:** Current working directory (assume user invoked skill from project)
- **Capture sources:** Which MCP tools to use for screenshots
- **Initial angle:** What seems interesting about this moment

## Phase 2: Capture

Capture assets based on what's running. Ask permission before capturing.

### Browser Screenshots (Claude-in-Chrome)
If a web app is running:
1. Use `mcp__claude-in-chrome__tabs_context_mcp` to find open tabs
2. Ask user which views/states to capture
3. Use `mcp__claude-in-chrome__computer` with `action: "screenshot"` for each
4. Save screenshots to a temporary location with descriptive names

### iOS Simulator Screenshots
If iOS Simulator is running:
1. Use iOS Simulator MCP to capture current screen
2. Ask if user wants to navigate to capture additional states
3. Capture each state with descriptive names

### Terminal Output
If relevant terminal output exists:
1. Ask user to describe what output to capture
2. Use Bash to capture or re-run commands if needed

### Code Snippets
Explore the current project to find relevant code:
1. Use Grep/Glob to find files related to what user described
2. Present candidate files/functions to user
3. Ask which to include in the post
4. Read and extract the relevant code sections

**Important:** After initial capture, tell the user you'll likely capture more after the interview based on what emerges.

## Phase 3: Interview

Use AskUserQuestion to draw out the insight. This is the core of the skill—these questions help the user articulate what's actually interesting.

### Question 1: Why Would Someone Care?
```
"If a reader stumbled on this post, why would they keep reading?
What problem does this solve for them, or what will they learn?"
```

Options might include:
- "Saves time on a common task"
- "Solves a tricky problem I struggled with"
- "Shows a pattern that's broadly applicable"
- "Demonstrates something non-obvious"
- [Let user write their own]

### Question 2: What's the Before/After?
```
"What was the situation before, and what changed?
What was hard or broken, and how is it better now?"
```

This surfaces the transformation story—the narrative arc.

### Question 3: What Surprised You?
```
"What's the non-obvious insight here? What did you learn that you
didn't expect, or what would surprise someone who hasn't done this?"
```

This pulls out the unique value—the thing that makes this post worth writing.

### Question 4: Who Else Has This Problem?
```
"Who specifically would benefit from reading this?
What would they search for to find this post?"
```

This connects the specific case to broader audience and informs SEO.

### Additional Probing
Based on answers, ask follow-up questions to deepen understanding:
- "Can you give me a concrete example of [X]?"
- "What would have happened if you hadn't figured this out?"
- "Is there a common misconception about this that your post could correct?"

**Goal:** By end of interview, you should clearly understand:
- The core insight/value proposition
- The narrative arc (problem → solution → result)
- The target reader and what they'd search for
- Key points to cover in the post

## Phase 4: SEO Research

Use the social-tools MCP autocomplete to research keywords.

### Find Keywords
```typescript
// Research what people search for around this topic
mcp__social-tools__autocomplete({
  engine: "google",
  query: "[main topic from interview]",
  expand: true,      // Get a-z variations
  questions: true    // Get question-based searches
})
```

Also try:
- YouTube autocomplete for tutorial-style searches
- Variations of key terms from the interview

### Generate SEO-Optimized Metadata
Based on keyword research, suggest:
- **Title options:** 2-3 SEO-optimized titles
- **Excerpt:** 1-2 sentences with keywords naturally included
- **Tags:** 3-5 relevant tags
- **seoTitle:** If different from display title
- **metaDescription:** For search results

Ask user to approve or modify these suggestions.

## Phase 5: Draft

Generate a structured outline based on everything gathered.

### Outline Structure
```markdown
# [Title]

> [Excerpt/hook]

## The Problem
- [Bullet points about the before state]
- [Why this mattered]
- [Screenshot: before state if captured]

## The Insight / What I Learned
- [The non-obvious thing]
- [Why this approach]
- [Code snippet if relevant]

## The Solution
- [What changed]
- [How it works]
- [Code snippet showing the solution]
- [Screenshot: after state]

## Results / What Changed
- [Before/after comparison]
- [Impact]

## Key Takeaways
- [Bullet point takeaway 1]
- [Bullet point takeaway 2]
- [Bullet point takeaway 3]

## What's Next
- [Where this is going]
- [Related topics]
```

### Include Assets
Reference all captured assets in the outline:
- Screenshots with descriptive captions
- Code snippets with context about what they show
- Any other captured materials

## Phase 6: Iterate

**This is critical.** Show the draft to the user and iterate until they're satisfied.

### Show the Draft
Present the complete draft outline to the user, including:
- Frontmatter (title, date, excerpt, tags, SEO fields)
- Full outline with sections and bullet points
- Asset references
- Suggested code snippets

### Get Feedback
Use AskUserQuestion:
```
"Here's the draft outline. What would you like to change?"
```

Options:
- "Looks good, let's create the PR"
- "Change the angle/focus"
- "Add/remove sections"
- "Adjust the title or SEO"
- "Capture more assets"
- [Free-form feedback]

### Iterate
Based on feedback:
- Revise the draft
- Capture additional assets if requested
- Re-research SEO if angle changed
- Show updated draft

**Repeat until user says "this looks good" or equivalent.**

## Phase 7: Package (Create PR)

Once approved, create the PR to the blog repo.

### Setup
```bash
# Clone blog repo fresh
cd /tmp
git clone https://github.com/neonwatty/blog.git blog-capture-$(date +%s)
cd blog-capture-*

# Create branch
git checkout -b blog/[generated-slug]
```

### Create Post Structure
```bash
# Create asset directory
mkdir -p public/images/posts/[slug]

# Copy captured assets
cp /path/to/captured/assets/* public/images/posts/[slug]/
```

### Generate Post File
Create `/posts/[slug].md` with:

```markdown
---
title: "[Approved title]"
date: "[Today's date YYYY-MM-DD]"
excerpt: "[Approved excerpt]"
tags: ["tag1", "tag2", "tag3"]
image: "/images/posts/[slug]/[cover-image].png"
seoTitle: "[SEO title if different]"
metaDescription: "[Meta description]"
---

[Approved outline content with proper asset references]
```

### Asset References
Update image paths in the markdown to use the blog's format:
```markdown
![Description](/images/posts/[slug]/screenshot-01.png)
```

### Create PR
```bash
# Commit
git add .
git commit -m "draft: [post title]"

# Push and create PR
git push -u origin blog/[slug]
gh pr create --title "Draft: [Post Title]" --body "$(cat <<'EOF'
## Blog Post Draft

**Topic:** [Brief description]

**Status:** Outline ready for expansion

### Assets included:
- [x] Screenshots ([count])
- [x] Code snippets ([count])
- [x] SEO metadata

### To complete this post:
- [ ] Expand bullet points into prose
- [ ] Review code snippets for accuracy
- [ ] Add any missing context
- [ ] Final proofread
EOF
)"
```

### Return PR URL
Tell the user:
- PR URL
- What's included (assets, outline sections)
- Next steps to complete the post

## Error Handling

### No Browser/iOS Sim Running
If user says something is running but MCP can't connect:
- Suggest they check if the app/simulator is visible
- Offer to proceed with code-only capture
- Can always add screenshots later

### Code Discovery Fails
If relevant code can't be found:
- Ask user to point to specific files
- Use their guidance to extract snippets

### Blog Repo Access Issues
If clone/push fails:
- Check if user has gh CLI authenticated
- Provide manual steps if needed

## Example Session

```
User: /blog-capture

Claude: [Asks orientation questions via AskUserQuestion]
- What are you working on? → "Seatify - a seating chart app"
- What's interesting? → "Just implemented iOS-style swipe-to-reveal actions"
- What's running? → "Browser at localhost:5173"

Claude: [Captures browser screenshots of the swipe actions]

Claude: [Interview questions]
- Why would someone care? → "React devs often struggle with iOS patterns on web"
- Before/after? → "Before: visible buttons cluttering UI. After: clean swipe gestures"
- What surprised you? → "Touch events on web are trickier than expected"
- Who else? → "React developers building mobile-first web apps"

Claude: [SEO research via autocomplete]
- Keywords: "react swipe actions", "ios swipe gesture react", "swipe to delete react"
- Suggests title: "Building iOS-Style Swipe Actions in React"

Claude: [Shows draft outline]
- Title, sections, bullet points, asset references

User: "Can you add a section about the touch event gotchas?"

Claude: [Updates draft with new section]

User: "This looks good, create the PR"

Claude: [Creates PR to blog repo]
- PR URL: https://github.com/neonwatty/blog/pull/42
- Assets: 3 screenshots, 2 code snippets
- Status: Ready for expansion
```

## Skill Dependencies

This skill requires the following MCP servers to be running:

1. **social-tools MCP** — For `mcp__social-tools__autocomplete` (SEO keyword research)
2. **Claude-in-Chrome MCP** (optional) — For browser screenshots
3. **iOS Simulator MCP** (optional) — For iOS Simulator screenshots

If screenshot MCPs aren't available, the skill can still work with code-only capture.

## Output Summary

At the end of a successful session, the user has:
- A PR to their blog repo with:
  - Structured outline in `/posts/[slug].md`
  - All assets in `/public/images/posts/[slug]/`
  - SEO-optimized frontmatter
- Clear next steps to expand into a full post
- All the context captured while it was fresh
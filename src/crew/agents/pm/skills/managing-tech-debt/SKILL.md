---
name: managing-tech-debt
description: Help users manage technical debt strategically. Use when someone is dealing with legacy code, planning refactoring work, deciding between rewrites vs. incremental fixes, trying to get buy-in for tech debt reduction, or balancing new features with maintenance.
---

# Managing Tech Debt

Help the user manage technical debt strategically using insights from 18 product leaders.

## How to Help

When the user asks for help with tech debt:

1. **Understand the situation** - Ask about the nature of the debt, how it's manifesting, and the business context
2. **Diagnose the urgency** - Determine if this is blocking critical business needs or a slower-burning issue
3. **Choose the right approach** - Decide between incremental improvement, targeted refactoring, or rarely a full rewrite
4. **Build the business case** - Quantify the cost of the debt and communicate value to stakeholders

## Core Principles

### Rewrites almost never work

Full rewrites are traps. Prefer incremental evolution and uplifting specific components rather than starting from scratch.

### Tech debt is product debt

Technical debt should be owned by PMs as product debt, not treated as an engineering-only concern.

### Startups should strategically take on debt

Debt is leverage early on, but you must monitor the interest. If maintenance consumes most of engineering time, you have run out of runway.

### Delete code more than you write it

Dedicated deletion improves velocity, clarity, and maintainability.

### Tech debt is visible to users

Fragmented UIs and poor integration between features are user-facing symptoms of accumulated debt.

### Quantify the value of paying down debt

Build custom metrics and run experiments to demonstrate business value.

### Fix bugs immediately, don't backlog them

Bug backlogs become graveyards.

### Debt ceilings innovation

When a team is buried in incidents and instability, debt reduction becomes prerequisite work for creative product development.

### Tech debt is a champagne problem

Build the simplest possible version first. Accept debt as the cost of learning before product-market fit.

### Plan for dark tunnels

Major rewrites can stall shipping for years. If you must do them, maintain momentum intentionally.

### Design for 1-2 years out

Implement foundational elements early enough to avoid catastrophic migrations later.

## Questions to Help Users

- "Is this debt blocking critical business needs, or is it slower-burning?"
- "What percentage of engineering time is going to maintenance versus new features?"
- "Have you tried to estimate how long a rewrite would actually take?"
- "What would happen if you did nothing for another 6 months?"
- "Is there a way to improve this incrementally rather than rewriting?"
- "How would you quantify the cost of this debt to stakeholders?"

## Common Mistakes to Flag

- **Planning a full rewrite**
- **Treating tech debt as engineering's problem**
- **Letting bug backlogs accumulate**
- **Over-engineering before product-market fit**
- **Not quantifying the cost**

## Deep Dive

For all 20 insights from 18 guests, see `references/guest-insights.md`.

## Related Skills

- technical-roadmaps
- platform-infrastructure
- engineering-culture
- evaluating-trade-offs

# Secure Source Code Review - Comprehensive Guide

## At a glance

Secure code review means reading source with an attacker's eye so vulnerabilities and design flaws get caught before release. In practice you combine three things: tooling (SAST, dependency scanners), a working catalogue of bug classes, and manual tracing of trust boundaries and business logic that no scanner understands. Staff-level interviews push on methodology, signal versus noise, and how you partner with the engineers who own the code.

This guide is that catalogue. Every review point comes with vulnerable and fixed code in Python, Go, and Node.js, because "check for IDOR" means very little until you've seen what the bug looks like inside a real handler.

---

## Learning outcomes

- Structure a review: scope, threat model, hotspots, verification.
- Spot each bug class in Python, Go, and Node.js code, and know the idiomatic fix in each.
- Know where in a codebase to look first and which grep strings get you there fast.
- Prioritize high-impact classes for the stack (injection, authorization, deserialization, concurrency) and explain the fix to the team that owns it.

---

## Prerequisites

Comfort with the OWASP Top 10 categories, and enough Python, Go, or JavaScript to read a request handler.

---

## How to read the code labs

Every review point below has the same four parts:

1. A short explanation of what the point means and how it breaks.
2. **Where to look:** the files, handlers, and grep strings that lead you to the bug.
3. **How to think:** the questions a reviewer asks once they're staring at that code.
4. A code lab with Python, Go, and Node.js tabs. Each tab puts the vulnerable version next to the fixed one.

Inside the snippets, `BUG:` comments sit on the exact line that makes the code exploitable, and `FIX:` comments sit on the line that closes the hole. Read the BUG line first, then go find its FIX. Your language choice carries across every lab on the page, so if you're interviewing at a Go shop, click Go once and stay there.

The snippets are trimmed handlers rather than full programs. Unless a point says otherwise, Python uses Flask, Go uses the standard library (`net/http` with Go 1.22 routing, `database/sql` with Postgres placeholders), and Node uses Express. Names like `db`, `audit`, `logger`, `render`, and `current_user` stand in for whatever the real app wires up.

---

## Six habits behind most findings

Nearly every finding in a review traces back to one of these. The sections that follow show each habit in code.

1. **Validate input against an allow list.** Check type, format, length, and range against what you expect. A list of known-bad characters always misses one.
2. **Keep data out of the command channel.** Hand input to SQL, shells, LDAP, and template engines as bound parameters or argument arrays, never as spliced strings.
3. **Bound every read and allocation.** Size limits on bodies, frames, and buffers, and no user input in format strings.
4. **Protect data with vetted crypto.** Slow salted hashes for passwords, authenticated encryption for data at rest, verified TLS in transit, and keys that live in a KMS.
5. **Encode output for its context.** HTML text, attributes, URLs, JavaScript, and CSS each need their own encoder. Let the framework do it whenever it can.
6. **Prefer indirect references.** Map user-supplied IDs to server-side objects so file paths, redirect targets, and records come from a set you control.

---

## Code Review Methodology

A review that starts by grepping for `eval` finds `eval` bugs. One that starts with the architecture finds the authorization bug that costs the company money. I work in four passes:

1. **Preparation.** Learn the architecture and stack, read whatever design docs and security requirements exist, find the critical data flows, and set up the tools (SAST, a local build, a debugger if you can get one).
2. **Discovery.** Map the authentication and authorization flows, list every input entry point, trace data from input to output, and mark where sensitive operations and data live.
3. **Analysis.** Walk each security-relevant component against the points in this guide, test the controls you find, and spend real time on business logic, since that's where tools are blind.
4. **Documentation.** Write findings with file and line references, a proof of concept where you can, a severity, and a fix the owning team can actually ship.

---

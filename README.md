# Lock

Lock lets you seal something until a specific time — and only then reveal it.

No accounts.  
No backend.  
No recovery.  

Just a link.

---

## What it does

- You create a vault.
- You choose a time.
- You get a URL.

Before the time:  
→ nothing unlocks.

After the time:  
→ the content is revealed.

That’s it.

---

## What you can lock

Anything that fits in text.

- Secrets
- Instructions
- URLs
- Other Lock vaults
- Any URI (`https://`, `mailto:`, `ipfs://`, etc.)

Lock does not interpret the content.  
It only unlocks it.

---

## Why this is interesting

A vault doesn’t have to reveal text.

It can reveal **links**.

And those links can point to:
- other vaults
- other times
- other places

Which means you can create:
- chains
- branches
- staged disclosures

Without Lock knowing or caring.

There is no graph.
There is no workflow.
There is no state.

It just unlocks what you sealed.

---

## How it works

- Encryption happens client-side.
- Time-locking is enforced cryptographically.
- The URL itself is the capability.

If you have the link, and the time has passed, it opens.

---

## What Lock is not

- Not a password manager
- Not a workflow engine
- Not a dashboard
- Not a platform

It’s a primitive.

---

## Status

This is an early project.

The surface area is intentionally small.
The behavior is intentionally boring.

The interesting part is what people do with it.

---

## Philosophy

> We unlock information.  
> What you do next is up to you.

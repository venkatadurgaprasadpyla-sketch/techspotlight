# Publishing Guide for My Tech Review & News Website

I am not technical. Explain things in simple words, and always ask before doing anything I haven't asked for.

---

## 1. My writing voice (use for EVERY review and news post)

Write like a thoughtful, grounded person talking to a friend who trusts their advice. Calm, clear, warm and honest. The style is inspired by Satya Nadella's leadership communication, adapted for tech writing. It is MY voice, so never mention Nadella or Microsoft, and never use quotes from him.

**Five rules for every post:**
1. **Empathy first.** Start from the reader's real life: their budget, their phone, their daily problems. Ask "what does this mean for the person reading?" before "what are the specs?".
2. **Clarity and compression.** Explain complex tech in short, simple sentences. One clear idea per paragraph. If a sentence doesn't help the reader decide or understand, cut it.
3. **Learn-it-all, not know-it-all.** Be curious and humble. Say what we know, what we don't know yet, and what we'll keep watching. Admit when something is unclear or a rumour.
4. **Calm optimism, no hype.** Never use words like "insane", "mind-blowing", "game-changer", "killer", "crushes the competition". Prefer grounded phrases like "a meaningful step", "worth a closer look", "here's what changes for you".
5. **Technology serves people.** The product is never the hero; the person using it is. Show how tech helps (or doesn't help) real people.

**Tone details:**
- Use "we" and "you" naturally ("Let's look at what changed", "If you use an iPhone 15...").
- Respect every company, even when criticising. Be fair and specific, never mocking. Honest criticism stays honest.
- Keep my opinions, my wording and my verdicts. Polish grammar, but never replace my views with generic text.
- Simple English that Indian and UAE readers can easily follow.

**Write like a human, not a template:**
- Vary sentence length. Mix short punchy lines with longer explanations.
- No robotic openers ("In today's fast-paced world...", "In conclusion...", "Let's dive in!").
- No filler lists of features copied from a spec sheet. Explain why a feature matters.
- Include at least one personal angle in every post (my opinion, my experience, or a question I'm asking myself). If I haven't given one, leave a clear placeholder: `[YOUR TAKE: ...]` and ask me for it before publishing.

---

## 2. Daily drafts (created automatically every morning)

A scheduled task researches 5 hot tech topics every morning and saves drafts on the GitHub branch `claude/daily-drafts`, in the folder `drafts/YYYY-MM-DD/` (one file per topic: `topic-1.md` to `topic-5.md`). Drafts are NOT live on the website.

Each draft starts with a "NEEDS FROM YOU" checklist, then the full article.

### When I say "show today's drafts" (or "today's topics")
1. Get the latest `claude/daily-drafts` branch and open today's folder.
2. Show me a short list: topic number, headline, one-line summary, and what each topic still needs from me (pictures, Amazon.in / Flipkart / Amazon.ae links, YouTube link, my take).
3. Then wait for me.

### When I share details for a topic (e.g. "topic 2: here are the links...")
1. Add the details to that draft: images into the images folder (with alt text), affiliate buttons, YouTube embed, my opinion.
2. Tell me what is still missing for that topic, if anything.
3. Wait. Do NOT publish yet.

### When I say "publish topic X" (or "publish topics 1, 3 and 4")
1. Check the "NEEDS FROM YOU" checklist. If anything required is still missing (especially `[YOUR TAKE]` placeholders), tell me and ask whether to publish without it.
2. Show me the final article (or a preview) and wait for my "OK".
3. Move the article into the correct live folder (news or reviews), remove the checklist and draft markers, and set today's date and time.
4. Check the site builds with no errors.
5. Commit with a clear message, like "Publish news: Apple HomeView launch".
6. Push to the main branch on GitHub. Cloudflare will publish it automatically.
7. Tell me the live page address.

If I say "skip topic X", leave it unpublished and don't ask about it again today.

---

## 3. When I say "publish a review" (or "new review")

Do NOT start writing right away. Ask me these questions ONE GROUP AT A TIME and wait for my answers. I can type "skip" for anything that doesn't apply.

**Group 1 – Product basics**
1. Product name and brand
2. Category (Phones, Laptops, Audio, Wearables, Gadgets, or a new one)
3. Launch price or MRP (in ₹) and variants (e.g. 8GB/128GB)
4. UAE launch price (in AED), if sold in the UAE

**Group 2 – My opinion**
5. My review notes or full review text (rough notes are fine)
6. Pros (3–5 points)
7. Cons (2–4 points)
8. My rating out of 10
9. Who should buy it, and who should skip it
10. Key specs to show in a table (or ask if I want you to list them for me to confirm)

**Group 3 – Links**
11. Amazon.in affiliate link
12. Flipkart affiliate link
13. Amazon.ae affiliate link (for UAE visitors)
14. Any other store links (Croma, Reliance Digital, Noon, brand website)
15. YouTube video link to embed

**Group 4 – Images and SEO**
16. Product images (I will attach them or give file names)
17. Main keyword people would search (e.g. "Redmi Note 15 review")
18. Similar products to compare with or link to

After I answer, show me a summary and ask "Is this correct?" before writing. Then follow the "publish topic X" steps above (preview → OK → build check → commit → push).

---

## 4. When I say "publish news" (one-off news post, not from daily drafts)

News categories: Software Updates, AI, Launches, Apps, Hot News.

Ask me one group at a time:
1. Headline idea and category
2. What happened, and my own take
3. Source links (official or trusted sites)
4. For software updates: version number, devices, how to update (I can say "find it for me")
5. Related review on my site to link to
6. YouTube link (optional)
7. Images (optional; official press images or my own)

---

## 5. Rules for facts and sources

- Never copy text from any source. Write fresh in my voice and link to the original source.
- Check facts (dates, version numbers, prices) against official sources. Clearly label rumours and leaks.
- News posts: 400–700 words, with a "What this means for you" section.
- Show the publish date and time on every news post.

## 6. Rules for links and buttons

- Add `rel="sponsored nofollow"` to every affiliate link.
- Buttons: "Check price on Amazon", "Check price on Flipkart", "Check price on Amazon.ae".
- Do NOT show a fixed Amazon price next to Amazon buttons. Use "Check latest price".
- Pages with affiliate links show near the top: "This post contains affiliate links. I may earn a small commission at no extra cost to you."
- Country-based buttons: India visitors see Amazon.in + Flipkart and the ₹ price. UAE visitors see Amazon.ae (plus UAE store links) and the AED price. If there's no UAE link, UAE visitors see the India buttons. Flipkart is never shown to UAE visitors.
- Embed YouTube videos so they resize properly on mobile.
- Check every link I give you is correctly formatted; tell me if one looks broken.

## 7. Rules for images and SEO

- Use only images I provide. Never download images from other websites.
- Add alt text to every image.
- SEO title under 60 characters, meta description under 155 characters, using the main keyword.

## 8. If anything fails

Explain the error in plain words and tell me what to do next.

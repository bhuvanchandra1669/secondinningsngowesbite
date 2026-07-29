# Second Innings — website

_Extending the life of sport._

A complete, ready-to-publish website for Second Innings. Nine pages, no build
step, no dependencies to install. Every file is plain HTML/CSS/JS that you can
open and edit directly.

---

## Viewing it on your machine

You can double-click `index.html` and it will open in a browser. But the nicer
way — and the one that behaves exactly like the real thing — is to run the tiny
local server included:

```bash
node .claude/serve.js
```

Then open **http://localhost:4173**. Stop it with `Ctrl+C`.

---

## What's here

```
index.html              Homepage — hero, the scroll story, impact, two doors
what-we-do.html         The four-step process, who receives, standards, FAQ
donate-gear.html        ★ Accept/don't-accept lists, how to hand over, form
request-equipment.html  ★ Eligibility, what happens next, application form
impact.html             Numbers, destinations, gear tracker, transparency
get-involved.html       Volunteer, drives, store partners, CSR, form
about.html              Story, mission, where we work, governance
team.html               The five roles, with photo slots
contact.html            Contact details and a general form
privacy.html            Plain-English privacy note

assets/css/style.css    Everything visual. Colours and type are at the very top.
assets/js/main.js       All the motion. Heavily commented.
assets/img/             Logo files (see below)
```

★ = the two pages that do the actual work. Everything else exists to get people
to one of them.

### Logo files

| File | Use |
|---|---|
| `mark-256.png` / `mark-512.png` | The circular mark, **background removed**. Used in the header, hero and footer. |
| `favicon.png` | Browser tab icon. |
| `og-image.jpg` | The preview image shown when the site is shared on WhatsApp, Instagram or LinkedIn. |
| `logo-mark-alpha.png` | Full-resolution transparent master of the mark (780px). Use this to make any new sizes. |
| `logo-full.png` | Your original file, untouched — mark plus wordmark, on white. |

The white background was cut out of the mark so it sits cleanly on colour. If you
ever get a proper **SVG** version of the logo, drop it in and swap the references
— it will be sharper and about 50× smaller.

---

## Editing the content

Everything is plain HTML. Open a file in any editor, find the words, change them.
A few things worth knowing:

**Changing the colours.** Top of `assets/css/style.css`, in the `:root` block. Change
`--orange-500` and `--navy-700` and the whole site follows.

**Adding a photo.** Find a block like this and replace the whole `<div class="photo-ph">`
with an `<img>`:

```html
<div class="photo-ph" style="--ar:4/3;"><span>Photo — collection day</span></div>
```

becomes

```html
<img src="assets/img/collection-day.jpg" alt="Volunteers sorting donated cricket bats">
```

Always write the `alt` text — it's what screen readers and Google both read.

**The header and footer are repeated in every file.** If you change a nav link,
change it in all nine. It's a bit tedious but it means there's no build step to
break later.

---

## Activating the forms ← do this first

All four forms (donate, request, get-involved, contact) already post to
**Manvithreddyyendoti@gmail.com** via [FormSubmit](https://formsubmit.co). No account,
no API key, no monthly fee — the email address is the endpoint.

**One thing must happen before they work.** FormSubmit will not deliver to an address
it hasn't verified:

1. Open the live site (or the local preview) and submit **one** test message.
2. FormSubmit emails Manvithreddyyendoti@gmail.com a confirmation link.
3. Click it. That form is now active forever.
4. Repeat once for each of the four forms — they verify per form, not per address.

Then delete the orange `setup-note` box above each form.

**To send somewhere else**, change the address in the form's `action` attribute:

```html
<form class="form" action="https://formsubmit.co/SOMEONE@example.com" method="POST" data-reveal>
```

**Once you have a domain**, you can send people to your own thank-you page instead of
FormSubmit's by adding this hidden field inside each form:

```html
<input type="hidden" name="_next" value="https://yourdomain.org/thank-you.html">
```

Each form already includes a `_subject` line so the emails are easy to filter, a
hidden `_honey` field that catches spam bots, and `_template=table` so submissions
arrive as a readable table rather than a wall of text.

If you outgrow email — and around a few dozen collections a month you will —
**Airtable** is the natural next step, so requests land in a spreadsheet you can
actually run collections from.

---

## Before you go live

Search the project for these and replace them:

| What | Where |
|---|---|
| **Impact numbers** (120 / 6 / 3 / 340) | `index.html`, `impact.html` — search `data-count`. There's an orange warning pill on the page next to them; delete it once the numbers are real. |
| **Photo placeholders** | Search `photo-ph`. Every one is labelled with what should go there. |
| **The founding story** | `about.html` — currently a note telling you what to write. |
| **Team names and photos** | `team.html` — five square photos and five names. |
| **Registration number** | Footer of all nine pages, plus `about.html` and `impact.html` |
| **Partner logos** | `index.html`, the `.partners` block |
| **The quote** | `index.html` and `impact.html` — currently placeholder text |
| **Destinations list** | `impact.html` — the timeline |
| **Phone and address** | `contact.html` |
| **Privacy review + date** | `privacy.html` |
| **Setup notes** | Five orange `setup-note` boxes — four above the forms, one on `team.html`. Delete each once done. |

**Coverage area.** The site says throughout that Second Innings collects across all of
Hyderabad and operates in no other city. If that changes, the places to update are
`donate-gear.html` (hero badge and the two collection cards), `what-we-do.html` (the
"Do you collect from my area?" FAQ), `about.html` ("Where we work") and `team.html`
(the Operations bullet).

**Two things not to get wrong:**

- **Never invent an impact number.** "63 items, 4 schools" is more persuasive than
  a round number nobody believes, and a funder who catches one invented figure will
  discount everything else on the page.
- **Get written consent before publishing any photo showing a child's face**, from
  the school and the family. It's stated as a commitment on three pages of this site,
  so it needs to be true.

---

## Publishing it

**Easiest — Netlify Drop.** Go to [app.netlify.com/drop](https://app.netlify.com/drop)
and drag this whole folder onto the page. It's live in about ten seconds, free,
with HTTPS. To update, drag it again.

**Better long-term — Vercel or Netlify connected to GitHub.** Push this folder to a
GitHub repo, connect it, and every change you push goes live automatically. Also free.

**Your domain.** Buy `secondinnings.org.in` or similar (~₹800–1,500/year from
Namecheap, GoDaddy or BigRock), then point it at your host — both Netlify and Vercel
walk you through it. This is the only thing about this website that costs money.

---

## Notes on the build

**Why plain HTML and not React/Next.js.** For a nine-page site maintained by
volunteers, a build step is a liability — it's the thing that breaks in eighteen
months when nobody remembers the setup. This runs anywhere, forever, and any
volunteer who can edit a Word document can edit a paragraph here. If you later add
a gear tracker or a CMS, that's the moment to reach for a framework.

**The motion.** GSAP + ScrollTrigger drive the scroll story on the homepage, loaded
from a CDN. **If they fail to load, the site still works** — `main.js` falls back to
plain IntersectionObserver and the story becomes a simple stacked sequence. Nothing
on this site depends on JavaScript to be readable.

**One convention to know if you edit the CSS.** Every rule that *hides* something
until JavaScript reveals it is scoped to `.js` — a class added to `<html>` by a
one-line script in each page's `<head>`. That way, if the JS ever fails, none of the
hiding rules apply and the page renders as plain readable content instead of a blank
screen. If you add a scroll animation, follow the same pattern: write
`.js .my-thing { opacity: 0 }`, never `.my-thing { opacity: 0 }`. It's a one-character
difference between "elegant" and "our website is blank for some visitors".

**Phones.** The pinned scroll sequence is deliberately switched off below 900px and
becomes a normal stacked story instead. Pinning long sequences on a phone feels
broken, and a lot of your audience — school coaches, small academies — will be on
mid-range Androids on patchy connections.

**Reduced motion.** Anyone whose device is set to "reduce motion" gets the site with
animation switched off. Some people get genuinely nauseous from drifting
backgrounds; this is not optional.

**Accessibility.** Skip link, keyboard-navigable menu and accordions, labelled form
fields, visible focus rings, real alt text where images exist. Please keep these when
you edit.

---

## Deliberately not built: a donations page

You said Second Innings is registered but doesn't yet hold **80G** certification.
So this site asks for **equipment, time and introductions** — not money. There is no
payment page, and the FAQ and transparency sections say plainly that you can't issue
tax-deductible receipts yet.

That's the honest position, and it's also the strategically better one: a donations
page without 80G converts poorly and invites exactly the question you can't answer well.

When 80G comes through, the structure is ready for it:

1. Add `support-us.html` using any existing page as the template.
2. Add it to the nav arrays in all nine files.
3. Razorpay Payment Pages can issue 80G receipts automatically — worth using rather
   than building receipt logic yourself.
4. Update `what-we-do.html` (FAQ), `impact.html` (transparency), `about.html`
   (governance) and `get-involved.html` (CSR note) — all four currently say you don't
   have it.

---

## Where to take it next

1. **Drop-off point map** on `donate-gear.html`, once you have more than a couple.
2. **The Gear Tracker** — teased on `impact.html`. Tag each item, let a donor look up
   where theirs went. This is the strongest idea on the site and nobody in Indian
   sports-equipment donation is doing it. Even a manually-updated version would work.
3. **A wishlist board** — "Vidya Nagar Govt School needs 6 footballs." Specific asks
   convert far better than general ones.
4. **Stories page** — once you have three or four real ones worth telling.

---

## One small housekeeping thing

The project folder is named `Second Innings NGO ` — with a trailing space. It's
harmless for the website, but it trips up some command-line tools. Worth renaming
to `Second Innings NGO` when you're not mid-session.

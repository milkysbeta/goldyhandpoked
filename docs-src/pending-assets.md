# Pending assets

Everything here is waiting on one thing: a logged-in Instagram session.
Anonymous access to profile media is blocked — instaloader stalls
indefinitely without credentials, so this cannot be automated from
inside the project.

## The one-time login

Run this in your own terminal. It prompts for the password itself and
saves a session file, so it is only ever needed once per machine.

```
instaloader --login=YOUR_IG_USERNAME --sessionfile=ig-session goldy_handpoked
```

## Specific posts requested

| Shortcode | Wanted for | Status |
|---|---|---|
| `C-vvxkhToPj` | the About / bio photo | pending |
| `Ck0Bd35gaLb` | bio photo candidate | pending |
| `C3o3L36PJ8N` | bio photo candidate | pending |

Fetch all three at once — note the `--` before the list, which stops
instaloader reading the leading `-` as a flag:

```
instaloader --login=YOUR_IG_USERNAME -- -C-vvxkhToPj -Ck0Bd35gaLb -C3o3L36PJ8N
```

Each lands in its own folder named after the shortcode. Then either:

* copy the chosen image to `public/bio/goldy-portrait.jpg`, or
* run `npm run images -- "-C-vvxkhToPj"` to push it through the same
  resize pipeline as the gallery

The bio photo is referenced in one place — `index.html`, the
`.bio__media img` src — so swapping it is a single line.

## The full work archive

```
instaloader --login=YOUR_IG_USERNAME goldy_handpoked
npm run images -- "goldy_handpoked"
```

Safe to re-run: running order, hidden flags and captions edited in
`/admin` are all preserved, and only new pieces are appended.

## Still to come from Goldy

- bio copy in her own words (placeholder is three sentences of filler)
- flash designs, high resolution
- any further background motifs

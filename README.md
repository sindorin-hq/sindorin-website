# www.sindorin.com

The Sindorin website, built with [Jekyll](https://jekyllrb.com/) 4.4.

## Set up Jekyll in WSL (Ubuntu 24.04)

You only need to do this once.

### 1. Install Ruby and the build tools

```bash
sudo apt update
sudo apt install -y ruby-full build-essential zlib1g-dev
```

This installs Ruby 3.2, which works with Jekyll 4.4. Check it with `ruby -v`.

### 2. Install gems in your home folder

Install gems into your home folder rather than system-wide, so you never need `sudo gem install`:

```bash
echo '# Install Ruby gems to ~/gems' >> ~/.bashrc
echo 'export GEM_HOME="$HOME/gems"' >> ~/.bashrc
echo 'export PATH="$HOME/gems/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Install Bundler

`Gemfile.lock` was created with Bundler 2.5.1, so install that version:

```bash
gem install bundler -v 2.5.1
```

### 4. Install the site's gems

From the repository folder:

```bash
cd ~/git/sindorin-website
bundle install
```

This installs Jekyll and the plugins listed in `Gemfile` (`jekyll-feed` and `jekyll-seo-tag`).

## Build and preview

Start a local server that rebuilds when files change:

```bash
bundle exec jekyll serve --livereload
```

Open <http://localhost:4000> in your Windows browser. WSL forwards the port automatically. Press `Ctrl+C` to stop.

Build the site once, without a server, into `_site/`:

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

`JEKYLL_ENV=production` is the production flag: it selects the live enquiry Worker and includes Google Analytics. Default development builds use the local Worker and omit analytics. Set this flag in the deployment environment when publishing the site.

Restart `jekyll serve` after changing `_config.yml`, because it isn't reloaded automatically.

## Enquiry form

The form endpoint is selected at build time using `JEKYLL_ENV`:

| Build | Form endpoint | Configuration in `_config.yml` |
|---|---|---|
| Default / development | `http://localhost:8787/enquiry` | `enquiry.action` |
| `JEKYLL_ENV=production` | `https://do.sindorin.com/enquiry` | `enquiry.production_action` |

JavaScript and native form submissions both use this endpoint. The Cloudflare Worker lives in `~/git/sindorin-workers`; see that repository's README for email variables, the Forward Email API secret, local development and deployment.

Deploy the Worker, configure its API secret and connect `do.sindorin.com` before publishing these site changes. The browser displays the inline thank-you only when the Worker confirms Forward Email accepted the message. A failed submission keeps the entered details available, displays the Worker's error when available and shows the direct email fallback. Requests time out after 15 seconds so visitors can retry. Without JavaScript, the browser validates required fields and email format, then the Worker returns an HTML confirmation/error page. Both paths submit multipart form data.

For a local preview, run the Worker using its README's local settings (which allow `http://localhost:4000` and `http://127.0.0.1:4000`), then start the site with the default development environment:

```bash
bundle exec jekyll serve
```

Check the production domain without sending an email:

```bash
curl -i -X OPTIONS https://do.sindorin.com/enquiry \
  -H 'Origin: https://www.sindorin.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type, Accept'
```

Expect `204` and `Access-Control-Allow-Origin: https://www.sindorin.com`. Repeat with `https://sindorin.com` to check the second allowed origin. This confirms routing and CORS; delivery also requires the Worker's email secret and verified sender configuration.

Run the form's client regression tests with Node.js 22 or later:

```bash
node --test tests/contact.test.cjs
```

## Troubleshooting

**Changes aren't picked up.** Keep the repository in the Linux file system (for example `~/git/...`), not under `/mnt/c/...`. File watching doesn't work reliably across the Windows mount. If you must work from `/mnt/c`, add `--force_polling` to `jekyll serve`.

**`Could not find ... in locally installed gems`.** Run `bundle install` again.

**Port 4000 is in use.** Run `bundle exec jekyll serve --port 4001`.

## Where things live

| Path | What it holds |
|---|---|
| `index.html`, `how-we-work.html`, `decision-sprint.html`, `shape.html`, `deliver.html`, `insights.html`, `contact.html` | The pages. Most copy is in each file's front matter. |
| `_posts/` | Insights articles. Front matter: `title`, `date`, `topic`, `reading_minutes`, `excerpt`. |
| `_data/services.yml` | The three services, used on Home, in the footer and on each service page. |
| `_layouts/` | `default`, `home`, `page` and `post`. |
| `_includes/` | Header, footer and reusable components (buttons, meta row, tables, panels). |
| `assets/css/` | `sindorin-tokens.css` (design tokens and fonts) and `site.css` (site styles). |
| `assets/js/` | The hero sphere, the Insights topic filter and the enquiry form. |
| `_config.yml` | Site details: company, ABN, contact details, enquiry form settings and analytics. |

### Adding an article

Create `_posts/YYYY-MM-DD-short-title.md`:

```markdown
---
title: The article headline
date: 2026-10-05
topic: Investment decisions   # Investment decisions, Stalled initiatives or AI and automation
reading_minutes: 5
excerpt: One or two sentences for the Insights list.
---
The first paragraph is shown as the standfirst.

## A section heading

Body text in Markdown.
```

The newest article appears as "Latest" on the Insights page and first on Home.

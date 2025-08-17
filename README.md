# My Personal Blog

A Jekyll-based personal blog hosted on GitHub Pages.

## Setup Instructions

### 1. Fork or Clone This Repository

If this is your repository, rename it to `yourusername.github.io` where `yourusername` is your GitHub username.

### 2. Customize the Configuration

Edit `_config.yml` and update:
- `title`: Your blog title
- `email`: Your email address
- `description`: Blog description
- `url`: Your GitHub Pages URL (`https://yourusername.github.io`)
- `github_username`: Your GitHub username
- `twitter_username`: Your Twitter handle (optional)

### 3. Update About Page

Edit `about.md` with your personal information.

### 4. Enable GitHub Pages

1. Go to your repository settings
2. Scroll to "Pages" section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### 5. Local Development (Optional)

To run locally:

```bash
# Install Ruby and Bundler first
gem install bundler

# Install dependencies
bundle install

# Serve the site
bundle exec jekyll serve
```

Visit `http://localhost:4000` to view your site.

## Writing Posts

Create new posts in the `_posts` directory with the filename format:
`YYYY-MM-DD-title.md`

Each post should start with front matter:

```yaml
---
layout: post
title: "Your Post Title"
date: YYYY-MM-DD HH:MM:SS +0000
categories: [category1, category2]
tags: [tag1, tag2]
---
```

## Customization

- **Layouts**: Modify files in `_layouts/`
- **Styling**: Edit `assets/css/style.css`
- **Navigation**: Update the nav section in `_layouts/default.html`

## Deployment

Changes are automatically deployed when you push to the main branch (if GitHub Pages is enabled).

Your blog will be available at: `https://yourusername.github.io`
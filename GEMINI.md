# Project Overview

This is a personal blog built with Jekyll and hosted on GitHub Pages. The blog is intended to share thoughts, tutorials, and experiences in technology and programming.

**Key Technologies:**

*   **Jekyll:** A static site generator written in Ruby.
*   **GitHub Pages:** Hosting for the static website.
*   **Markdown:** Used for writing blog posts.
*   **Liquid:** Jekyll's templating language.
*   **HTML/CSS/JavaScript:** For the site's structure, styling, and behavior.

**Architecture:**

*   The main configuration is in `_config.yml`.
*   Layouts are defined in the `_layouts` directory, with `default.html` as the base template and `post.html` for blog posts.
*   Blog posts are located in the `_posts` directory and are written in Markdown.
*   The main entry point is `index.html`, which displays a list of recent posts.
*   Styling is handled by `assets/css/style.css`.

# Building and Running

**1. Install Dependencies:**

```bash
bundle install
```

**2. Run the Development Server:**

```bash
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`.

# Development Conventions

*   **Blog Posts:** Create new posts in the `_posts` directory with the filename format `YYYY-MM-DD-title.md`.
*   **Front Matter:** Each post must include front matter with `layout`, `title`, `date`, `categories`, and `tags`.
*   **Styling:** Modify `assets/css/style.css` for any style changes.
*   **Layouts:** Modify the HTML structure in the `_layouts` directory.

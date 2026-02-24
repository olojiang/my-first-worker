Modular Cloudflare Worker refactor scaffolding.

Notes:
- The HTML templates are loaded via ES module imports using the '?raw' loader. Ensure wrangler/esbuild is configured to treat .html as text.
- All modules are under 400 lines and use ES modules (import/export).
- This patch focuses on the structural refactor; adjust OAuth credentials and bindings in your environment.

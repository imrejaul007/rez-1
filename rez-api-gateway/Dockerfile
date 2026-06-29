FROM nginx:1.27

# ── Install Brotli module ─────────────────────────────────────────────────────
# The official nginx:1.27 image includes ngx_http_brotli_filter_module by default
# on the Debian-based variant. Alpine does NOT include Brotli.
# Using nginx:1.27 (Debian) instead of nginx:1.27-alpine for Brotli support.

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

# Copy our template (env vars will be substituted at runtime)
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Render requires the container to listen on $PORT (default 10000)
EXPOSE 10000

CMD ["/start.sh"]

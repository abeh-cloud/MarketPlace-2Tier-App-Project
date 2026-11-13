
FROM nginx:alpine

# Copy all frontend files, including assets and images
COPY . /usr/share/nginx/html/

# Install the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

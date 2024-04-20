# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

COPY ../../server.js ./


# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy all application files to the working directory
COPY . .

# Expose port 3000 to the outside world
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]

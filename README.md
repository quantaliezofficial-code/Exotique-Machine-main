# Luxura Motors 🚗

India's premier digital showroom for luxury, electric, and performance vehicles.

## Features

- 🏎️ Browse luxury vehicle inventory with detailed specs
- 💰 Interactive EMI/Finance calculator
- 🔄 Trade-in valuation estimator
- 📅 VIP test drive booking
- 🔧 Precision service scheduling
- 🎁 Exclusive offers & promotions
- ❤️ Personal garage (favorites, bookings, sessions)

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — fast build & dev server
- **Tailwind CSS v4** — utility-first styling
- **Framer Motion** / **GSAP** — animations
- **Lucide React** — icons

## Run Locally

**Prerequisites:** Node.js ≥ 18

```bash
npm install
npm run dev
```

App starts at [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects **Vite** — no extra config needed
4. Click **Deploy** ✅

The included `vercel.json` handles SPA routing, caching, and security headers.

## Docker Deployment 🐳

### 1. Build & Run with Docker Compose (Recommended)

```bash
# Build image and start container in background
docker compose up -d --build
```
Your website will be live at [http://localhost:3000](http://localhost:3000).

To stop the container:
```bash
docker compose down
```

### 2. Manual Docker Build & Run

```bash
# Build the production image
docker build -t exotique-machines:latest .

# Run container on port 3000
docker run -d -p 3000:80 --name exotique-machines-web exotique-machines:latest
```

### 3. Push to Docker Hub / Cloud Registry

```bash
# Log in to Docker Hub
docker login

# Tag the image with your Docker Hub username
docker tag exotique-machines:latest YOUR_DOCKERHUB_USERNAME/exotique-machines:latest

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/exotique-machines:latest
```

On your VPS or cloud server, pull and run:
```bash
docker run -d -p 80:80 --restart unless-stopped YOUR_DOCKERHUB_USERNAME/exotique-machines:latest
```

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
├── index.html          # Entry HTML with SEO meta tags
├── vercel.json         # Vercel deployment config
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── public/             # Static assets (favicon)
└── src/
    ├── main.tsx        # React entry point
    ├── App.tsx         # Root application component
    ├── index.css       # Global styles & Tailwind imports
    ├── types.ts        # TypeScript interfaces
    ├── data.ts         # Vehicle data & content
    └── components/     # React components
```

## License

Private — All rights reserved.

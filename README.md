# PBNC Document Intelligence

An intelligent document processing platform designed to extract, analyze, and manage information efficiently.

## 🚀 Overview

PBNC Document Intelligence leverages modern technologies to provide robust document extraction and processing capabilities. It features a high-performance backend, an asynchronous task queue, and a responsive frontend.

## 🛠 Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Database & Cache:** PostgreSQL, Redis
- **Workers:** Celery
- **AI / Extraction:** Google Gemini API

## ⚙️ Getting Started

### Prerequisites

Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aadi-110i/PBNC.git
   cd PBNC
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Update the `.env` file with your actual credentials (e.g., `GEMINI_API_KEY`).*

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

## 📂 Project Structure

- `/frontend` - React application source code.
- `/backend` - FastAPI server, Celery workers, and database models.
- `docker-compose.yml` - Container orchestration for local development.

## 📄 License

This project is proprietary and confidential.

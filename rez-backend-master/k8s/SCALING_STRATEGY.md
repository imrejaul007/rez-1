# REZ Backend Scaling Strategy (ScalePilot Round 2)

## Architecture Overview

The REZ backend is deployed as a stateless microservice architecture with separate API and worker processes to optimize horizontal scaling.

## Key Components

1. **API Server (merchant-backend)** — HTTP request handling
   - 3-20 replicas via HPA

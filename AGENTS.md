# CampusVenture Development Guide

CampusVenture is an institutional SaaS platform connecting student founders with investors and university incubators through AI investment readiness assessments, verified academic credentials, and institutional due diligence rooms.

## Core Architecture
- **Framework**: TanStack Start / React 19 / Nitro
- **Styling**: Tailwind CSS & Radix UI primitives
- **Database**: Supabase Cloud PostgreSQL with Row Level Security (RLS)
- **AI Readiness**: Google Gemini & OpenAI due diligence engine with offline heuristic fallbacks
- **State**: TanStack Query & Venture Store context

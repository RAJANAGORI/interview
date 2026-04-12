# Interview Preparation - Security Topics

A comprehensive, open-source interview preparation repository covering all major security topics with detailed guides, interview questions, critical clarifications, and quick references.

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Core Security Topics](#core-security-topics)
- [Product Security Topics](#product-security-topics)
- [Special Topics](#special-topics)
- [Configuration & Scripts](#configuration--scripts)
- [Practice & Exercises](#practice--exercises)
- [Resources](#resources)

---

## 🎯 Overview

This repository is designed to help security professionals prepare for technical interviews. Each topic includes:

- **Comprehensive Guide** - In-depth technical documentation
- **Interview Questions & Answers** - Real-world interview scenarios
- **Critical Clarification** - Common misconceptions and clarifications
- **Quick Reference Guide** - Quick lookup for key concepts

### Key Features

- ✅ **65+ indexed topic entries** (core, product, special) — see `Config/topics.json` and the [Topic Syllabus Index](Interview%20Preparation/Topic%20Syllabus%20Index.md)
- ✅ **Structured Content** - Organized by category (Core, Product, Special)
- ✅ **Real-World Scenarios** - Practical examples and use cases
- ✅ **Interview-Focused** - Tailored for 6.5+ years experienced professionals

---

## 🚀 Getting Started

### One-stop learning (basics → interview)

- **[Content Mastery Framework](Interview%20Preparation/Content%20Mastery%20Framework.md)** — How topics are structured (literacy → mechanics → judgment → interview performance).
- **[Topic Syllabus Index](Interview%20Preparation/Topic%20Syllabus%20Index.md)** — All indexed topics with tiers, prerequisites, and time budgets.
- **[Role-Based Study Paths](Interview%20Preparation/Role-Based%20Study%20Paths.md)** — Curricula for Product Security, AppSec, Staff+, and a 21-day sprint.
- **[Recommended Additional Topics](Interview%20Preparation/Recommended%20Additional%20Topics.md)** — Suggested new folders and merge guidance.

### Quick Start

1. **Start Your Journey**
   - Read the [Quick Start Guide](Interview%20Preparation/Quick%20Start%20Guide.md)
   - Review the [Study Plan](Interview%20Preparation/Study%20Plan.md)
   - Track your progress with the [Progress Tracker](Interview%20Preparation/%F0%9F%93%8A%20Interview%20Preparation%20Progress%20Tracker.md)

2. **Main Index**
   - [Interview Preparation.md](Interview%20Preparation.md) - Complete topic index and navigation

---

## 📁 Project Structure

```
interview/
├── 📚 Topic Folders/          # 65+ security topic directories
├── ⚙️ Config/                  # Configuration files (topics.json, depth data)
├── 🔧 Scripts/                # Python automation scripts
├── 🎯 Practice & Exercises/   # Practice materials
├── 📝 Interview Preparation/  # General guides, study plans, and resources
└── 📄 Interview Preparation.md # Main index file
```

---

## 🔐 Core Security Topics

### Authentication & Authorization

- **[JWT (JSON Web Token)](JWT%20(JSON%20Web%20Token)/)** - Token-based authentication, JWT structure, security best practices
- **[OAuth](OAuth/)** - OAuth 2.0 framework, flows, and security considerations
- **[JWT vs OAuth](JWT%20vs%20OAuth/)** - Comparison and when to use each
- **[Authorization and Authentication](Authorization%20and%20Authentication/)** - Core concepts, differences, and implementation
- **[SAML and Enterprise Federation](SAML%20and%20Enterprise%20Federation/)** - SAML 2.0, SSO, IdP/SP trust, and enterprise B2B patterns

### Session & Cookie Security

- **[Session Fixation and Session Hijacking](Session%20Fixation%20and%20Session%20Hijacking/)** - Session attacks and mitigations
- **[Cookie Security](Cookie%20Security/)** - HttpOnly, Secure flags, cookie security best practices

### Web Application Vulnerabilities

- **[SQL Injection](SQL%20Injection/)** - SQL injection attacks, prevention, parameterized queries
- **[XSS (Cross-Site Scripting)](XSS/)** - XSS types, prevention, Content Security Policy
- **[CSRF](CSRF/)** - Cross-Site Request Forgery attacks and defenses
- **[XSS vs CSRF](XSS%20vs%20CSRF/)** - Differences, similarities, and combined defenses
- **[IDOR (Insecure Direct Object Reference)](IDOR/)** - Access control vulnerabilities and authorization
- **[XXE (XML External Entity)](XXE/)** - XML external entity attacks
- **[SSRF (Server-Side Request Forgery)](SSRF/)** - SSRF attacks and prevention
- **[MITM Attack](MITM%20Attack/)** - Man-in-the-middle attacks and TLS protection

### Security Fundamentals

- **[Encryption vs Hashing](Encryption%20vs%20Hashing/)** - Cryptographic concepts and use cases
- **[Digital Signatures](Digital%20Signatures/)** - Digital signature algorithms and verification
- **[Parameterized and Prepared Statement](Parameterized%20and%20Prepared%20Statement/)** - SQL injection prevention
- **[CORS and SOP](CORS%20and%20SOP/)** - Cross-Origin Resource Sharing and Same-Origin Policy
- **[OSI Layer](OSI%20Layer/)** - The seven-layer reference model and security at each layer

### Network & Protocol Security

- **[TLS](TLS/)** - Transport Layer Security, TLS handshake, certificate management
- **[TCP vs UDP](TCP%20vs%20UDP/)** - Protocol differences and security implications
- **[HTTP Refresh verbs and status codes](HTTP%20Refresh%20verbs%20and%20status%20codes/)** - HTTP protocol details

### Security Headers

- **[Security Headers](Security%20Headers/)** - Security headers implementation and best practices

---

## 🏢 Product Security Topics

### Cloud Security

- **[Cloud Security Architecture](Cloud%20Security%20Architecture/)** - AWS, Azure, GCP security architecture
- **[Container Security](Container%20Security/)** - Docker, Kubernetes security, image scanning
- **[Infrastructure as Code (IaC) Security](Infrastructure%20as%20Code%20Security/)** - Terraform, CloudFormation security
- **[Cloud-Native Security Patterns](Cloud-Native%20Security%20Patterns/)** - Zero Trust, service mesh, microservices security

### Application Security

- **[Secure Microservices Communication](Secure%20Microservices%20Communication/)** - Microservices security patterns
- **[Cross-Origin Authentication](Cross-Origin%20Authentication/)** - Cross-origin authentication strategies
- **[Third-Party Integration Security](Third-Party%20Integration%20Security/)** - Third-party API security
- **[System vs Personal API Tokens](System%20vs%20Personal%20API%20Tokens/)** - API token management
- **[GraphQL and API Security](GraphQL%20and%20API%20Security/)** - GraphQL-specific attack surfaces, introspection, query complexity
- **[gRPC and Protobuf Security](gRPC%20and%20Protobuf%20Security/)** - gRPC security patterns and protobuf hardening

### Security Assessment & Testing

- **[Penetration Testing and Security Assessment](Penetration%20Testing%20and%20Security%20Assessment/)** - Penetration testing methodologies
- **[Proactive Security Assessment](Proactive%20Security%20Assessment/)** - Proactive security measures
- **[Product Security Assessment Design](Product%20Security%20Assessment%20Design/)** - Security assessment frameworks

### Incident Response

- **[Production Security Incident Response](Production%20Security%20Incident%20Response/)** - Production incident handling
- **[Multi-Team Security Incident Response](Multi-Team%20Security%20Incident%20Response/)** - Cross-team incident coordination

### Security Operations

- **[Security vs Usability Balance](Security%20vs%20Usability%20Balance/)** - Balancing security and user experience
- **[Security-Development Collaboration](Security-Development%20Collaboration/)** - DevSecOps practices
- **[Agile Security Compliance](Agile%20Security%20Compliance/)** - Security in agile development
- **[Web Application Security Vulnerabilities](Web%20Application%20Security%20Vulnerabilities/)** - OWASP Top 10 and beyond
- **[Security Metrics and OKRs](Security%20Metrics%20and%20OKRs/)** - Measuring security program effectiveness
- **[Vulnerability Management Lifecycle](Vulnerability%20Management%20Lifecycle/)** - End-to-end vulnerability handling

### Real-World Scenarios

- **[Product Security Real-World Scenarios](Product%20Security%20Real-World%20Scenarios/)** - Beginner to advanced scenario-based questions with detailed answers and DFDs
- **[Microsoft Product Security Engineer II Interview Prep](Microsoft%20Product%20Security%20Engineer%20II%20Interview%20Prep/)** - Role-specific preparation with mastery track

### Senior/Staff Expansion Topics

- **[Secure CI CD Pipeline Security](Secure%20CI%20CD%20Pipeline%20Security/)** - Hardening CI/CD controls, artifact trust, and security gates
- **[Software Supply Chain Security](Software%20Supply%20Chain%20Security/)** - SBOM, provenance, and dependency governance at scale
- **[Secrets Management and Key Lifecycle](Secrets%20Management%20and%20Key%20Lifecycle/)** - Secret sprawl reduction and key rotation strategy
- **[Zero Trust Architecture for Product Security](Zero%20Trust%20Architecture%20for%20Product%20Security/)** - Identity-first architecture and policy-driven access
- **[GenAI LLM Product Security](GenAI%20LLM%20Product%20Security/)** - Prompt/tool security, data leakage controls, and safe AI workflows
- **[IAM and Least Privilege at Scale](IAM%20and%20Least%20Privilege%20at%20Scale/)** - Identity governance and privilege minimization for large orgs
- **[Security Observability and Detection Engineering](Security%20Observability%20and%20Detection%20Engineering/)** - Detection lifecycle, telemetry quality, and response signal
- **[Business Logic Abuse and Fraud Threats](Business%20Logic%20Abuse%20and%20Fraud%20Threats/)** - Abuse-resistant product workflows and fraud prevention
- **[Browser and Frontend Runtime Security Deep Dive](Browser%20and%20Frontend%20Runtime%20Security%20Deep%20Dive/)** - Browser-side controls, CSP, Trusted Types, and runtime hardening
- **[Risk Prioritization and Security Metrics](Risk%20Prioritization%20and%20Security%20Metrics/)** - Staff-level risk decisioning and program metrics
- **[DDoS and Resilience](DDoS%20and%20Resilience/)** - Volumetric, protocol, and application-layer attack defense and resilience patterns
- **[Rate Limiting and Abuse Prevention](Rate%20Limiting%20and%20Abuse%20Prevention/)** - Rate-limit algorithms, abuse detection, and progressive response

---

## 🔍 Special Topics

### Threat Modeling & Code Review

- **[Threat Modeling](Threat%20Modeling/)** - STRIDE, DREAD, threat modeling methodologies
- **[Secure Source Code Review](Secure%20Source%20Code%20Review/)** - Code review techniques and security patterns

---

## ⚙️ Configuration & Scripts

### Configuration

- **[Config/](Config/)** - Configuration files
  - `topics.json` - Complete topic index with file mappings and metadata
  - `topic_interview_depth.json` - Per-topic **verified** interview depth (references + follow-ups)

### Scripts

- **[Scripts/](Scripts/)** - Automation and utility scripts
  - `build_topic_interview_depth.py` - Build topic depth data from depth_data modules
  - `apply_verified_topic_depth.py` - Apply verified depth data to topic files
  - `append_interview_depth_section.py` - Append interview depth sections
  - `refine_interview_modules.py` - Refine and update interview modules
  - `depth_data_*.py` - Source data for per-topic interview depth

---

## 🎯 Practice & Exercises

- **[Practice & Exercises/](Practice%20&%20Exercises/)** - Practice materials and exercises
  - Communication practice guides
  - Daily practice schedules
  - Interview simulation exercises

---

## 📝 Interview Preparation Resources

- **[Interview Preparation/](Interview%20Preparation/)** - General guides and resources
  - `Content Mastery Framework.md` - Standard for depth and interview readiness per topic
  - `Topic Syllabus Index.md` - Full topic map with tiers and prerequisites
  - `Role-Based Study Paths.md` - Role-specific curricula
  - `Study Plan.md` - Structured study plan
  - `Quick Start Guide.md` - Getting started guide
  - `📊 Interview Preparation Progress Tracker.md` - Track your preparation progress

---

## 📊 Statistics

- **Total Topics**: 65+ indexed entries (see `Config/topics.json`)
- **Categories**: Core Security, Product Security, Special Topics
- **Content Types**: Comprehensive Guides, Interview Questions, Critical Clarifications, Quick References
- **Target Audience**: 6.5+ years experienced security professionals

---

## 🛠️ Usage

### For Interview Preparation

1. Start with the [Study Plan](Interview%20Preparation/Study%20Plan.md)
2. Follow the [Quick Start Guide](Interview%20Preparation/Quick%20Start%20Guide.md)
3. Use the [Progress Tracker](Interview%20Preparation/%F0%9F%93%8A%20Interview%20Preparation%20Progress%20Tracker.md) to track your progress
4. Review topics based on your interview requirements

---

## 📚 Content Structure

Each topic folder typically contains:

```
Topic Name/
├── Topic Name.md                          # Index file with links
├── Topic Name - Comprehensive Guide.md    # Detailed technical guide
├── Topic Name - Interview Questions.md    # Interview Q&A
├── Critical Clarification Topic Name Misconceptions.md  # Common misconceptions
└── Topic Name - Quick Reference.md        # Quick reference guide
```

---

## 🤝 Contributing

This is an open-source project. Contributions, improvements, and feedback are welcome!

---

## 📝 Notes

- **Memorization Warning**: Don't try to memorize everything at once. Follow the study plan and practice regularly.
- **Interview Advice**: 
  - Stay confident even if rejected
  - Stay calm if interviewer is disrespectful
  - It's okay not to know everything
  - Apply and move on - if it's meant for you, it will come

---

## 🔗 Quick Links

- [Main Index](Interview%20Preparation.md)
- [Study Plan](Interview%20Preparation/Study%20Plan.md)
- [Quick Start Guide](Interview%20Preparation/Quick%20Start%20Guide.md)
- [Progress Tracker](Interview%20Preparation/%F0%9F%93%8A%20Interview%20Preparation%20Progress%20Tracker.md)

---

**Good luck with your interview preparation! 🚀**

*Remember: Preparation is key, but confidence and authenticity matter just as much.*

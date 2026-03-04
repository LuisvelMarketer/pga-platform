# PGA Platform - Multi-Tier Licensing

**Copyright © 2025-2026 Luis Alfredo Velasquez Duran**
**All Rights Reserved (with exceptions below)**

---

## 📋 License Structure

PGA Platform uses a **multi-tier licensing model** to balance open-source community growth with commercial sustainability:

| Package/Component | License | Usage |
|-------------------|---------|-------|
| `@pga-ai/core` | **MIT License** | Free, open source, commercial use allowed |
| `@pga-ai/adapters-llm` | **MIT License** | Free, open source, commercial use allowed |
| `@pga-ai/adapters-storage` | **MIT License** | Free, open source, commercial use allowed |
| `@pga-ai/cli` | **MIT License** | Free, open source, commercial use allowed |
| **Gene Registry** | **BSL 1.1** | Business Source License (see below) |
| **PGA Cloud (SaaS)** | **Proprietary** | Commercial license required |
| **Enterprise Features** | **Proprietary** | Commercial license required |

---

## 1️⃣ Open Source Components (MIT License)

### Packages: `@pga-ai/core`, `@pga-ai/adapters-*`, `@pga-ai/cli`

```
MIT License

Copyright (c) 2025-2026 Luis Alfredo Velasquez Duran

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**What this means:**
- ✅ Free to use commercially
- ✅ Free to modify and redistribute
- ✅ Can be included in proprietary software
- ✅ No attribution required (but appreciated)

---

## 2️⃣ Gene Registry (Business Source License 1.1)

### Component: Gene Registry, Gene Marketplace, Inheritance System

**License**: Business Source License 1.1 (BSL 1.1)

**Change Date**: 2029-02-27 (4 years from publication)

**Change License**: Apache 2.0

**Additional Use Grant**: You may use the Gene Registry in production for:
- Non-commercial purposes
- Internal business use with <100 active genomes
- Educational and research purposes

**Commercial Restriction**: You may NOT:
- Offer the Gene Registry as a hosted service to third parties
- Build a competing marketplace on top of PGA's Gene Registry
- Re-sell access to validated genes without revenue sharing agreement

**After Change Date (2029-02-27)**: This component becomes fully open source under Apache 2.0.

**Rationale**: The Gene Registry represents the core competitive moat through network effects. This license protects the business model while ensuring eventual open-source release.

---

## 3️⃣ Proprietary Components

### Components: PGA Cloud, Enterprise Features, Advanced AI (Meta-Learning, AutoML)

**License**: Proprietary - Commercial License Required

**Usage**: Requires a valid commercial license agreement with:
- **PGA AI Inc.** (to be incorporated)
- **Luis Alfredo Velasquez Duran** (current copyright holder)

**Contact**: For commercial licensing inquiries:
- Email: licensing@pga.ai
- Website: https://pga.ai/enterprise

**Pricing**:
- **PGA Cloud SaaS**: See https://pga.ai/pricing
- **Enterprise On-Premise**: Custom contract ($50K - $250K/year)
- **White Label**: Contact sales

---

## 🛡️ Patent Protection

**Patent Status**: Patent Pending

The following inventions are protected by patent applications:
1. **Method for Genomic Evolution of AI Prompts** (US Patent Application)
2. **Cross-Agent Genetic Inheritance System** (EU Patent Application)
3. **Three-Layer Immutable Prompt Architecture** (International PCT)

See [PATENTS.md](./PATENTS.md) for detailed information.

**Patent Notice**: This software may be covered by one or more patent applications. Use of patented features requires compliance with applicable patent licenses.

---

## 📝 Trademark Notice

**"PGA"**, **"Genomic Self-Evolving Prompts"**, and **"Living OS for AI Agents"** are trademarks of Luis Alfredo Velasquez Duran.

**Trademark Filing Status**: In progress (2026)

**Usage Policy**:
- ✅ You may use these terms to refer to this software
- ✅ You may use in educational/non-commercial contexts
- ❌ You may NOT use in competing products
- ❌ You may NOT register similar trademarks

---

## 🔒 Trade Secrets

Certain algorithms, parameters, and operational data are maintained as **trade secrets**:
- Fitness function parameters
- Mutation rate optimization algorithms
- Gene validation scoring models
- Production performance data

**Protection**: These are not disclosed in public repositories and are protected under trade secret law.

---

## 🤝 Contributor License Agreement (CLA)

**For Open Source Components (MIT)**: No CLA required. Contributions accepted via GitHub PR.

**For BSL Components**: Contributors must sign a CLA granting:
- Rights to use contribution under current BSL license
- Rights to relicense after Change Date
- Patent grant for contributed code

**CLA Process**: Automated via CLA Assistant on first PR.

---

## 📞 Contact & Questions

**General Inquiries**: contact@pga.ai
**Licensing Questions**: licensing@pga.ai
**Security Issues**: security@pga.ai
**Patent Questions**: patents@pga.ai

**Creator**: Luis Alfredo Velasquez Duran
**Location**: Germany
**Year**: 2025-2026

---

## 🔗 Additional Resources

- [PATENTS.md](./PATENTS.md) - Patent details and prior art documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](./SECURITY.md) - Security policy
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - Community standards

---

## ⚖️ Legal Disclaimer

This LICENSE.md is a summary and does not constitute legal advice. For authoritative license terms:
- MIT components: See individual package.json files
- BSL components: See full BSL 1.1 text at https://mariadb.com/bsl11/
- Proprietary components: Contact for commercial license agreement

**Last Updated**: 2026-02-27
**Version**: 1.0.0

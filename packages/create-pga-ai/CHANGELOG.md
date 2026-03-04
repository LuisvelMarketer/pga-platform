# Changelog

All notable changes to `create-pga-ai` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-27

### Added
- 🎉 Initial release of create-pga-ai
- Interactive CLI installer with beautiful UI (figlet banner, boxen, chalk colors, ora spinners)
- Support for multiple LLM providers (Anthropic Claude, OpenAI GPT, or both)
- Multiple storage backends (PostgreSQL for production, in-memory for development)
- Evolution Boost 2.0 integration (10x faster evolution)
- 5 project templates:
  - Chatbot Agent (general conversation)
  - Code Assistant (programming helper)
  - Customer Support (support automation)
  - Data Analysis (analytics & insights)
  - Custom (blank starter)
- Automatic dependency installation
- Complete project scaffolding:
  - TypeScript configuration
  - Environment file generation (.env + .env.example)
  - Gitignore setup
  - README generation
  - Example source files with template-specific content
- CLI flags for non-interactive usage:
  - `--template` - Select project template
  - `--llm` - Choose LLM provider
  - `--storage` - Select storage backend
  - `--boost` - Enable Evolution Boost 2.0
  - `--skip-install` - Skip npm install
- Comprehensive documentation with examples
- npm 7+ support with `npm create` command

### Features
- One-command project creation: `npm create pga-ai@latest my-agent`
- Interactive prompts with sensible defaults
- Project name validation (lowercase, hyphens only)
- Smart package selection based on configuration
- Generated projects include:
  - Development scripts (dev, build, start, test)
  - Type-safe TypeScript setup
  - ESM modules
  - Ready-to-use LLM adapters
  - Environment-based configuration

[0.1.0]: https://github.com/pga-platform/pga/releases/tag/create-pga-ai-v0.1.0

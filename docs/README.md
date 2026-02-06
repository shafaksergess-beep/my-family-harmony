# Family Together Documentation

Welcome to the Family Together documentation. This folder contains detailed documentation for the application's domain logic and technical implementation.

## Documentation Index

| Document | Description |
|----------|-------------|
| [DOMAIN_LOGIC.md](./DOMAIN_LOGIC.md) | Core business rules: Njangi, loans, contributions, assistance |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture and code organization |

## Quick Links

### For Developers
- **Domain Logic**: Understanding Njangi, loan calculations, contribution rules → [DOMAIN_LOGIC.md](./DOMAIN_LOGIC.md)
- **Architecture**: Code structure, patterns, and conventions → [ARCHITECTURE.md](./ARCHITECTURE.md)

### Key Business Concepts

#### Njangi (Rotating Savings)
A traditional rotating savings scheme where members contribute monthly and one member receives the pooled funds each period. See [DOMAIN_LOGIC.md#njangi-rotating-savings](./DOMAIN_LOGIC.md#njangi-rotating-savings).

#### Loan Interest
Simple interest at configurable annual rate (default 10%). Formula:
```
Total Interest = Principal × (Rate/100) × (Months/12)
```

#### Assistance Events
Financial support for life events (births, deaths, weddings, sickness) with configurable amounts per event type.

## Getting Started

1. Read [DOMAIN_LOGIC.md](./DOMAIN_LOGIC.md) to understand the business rules
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical context
3. Check the main [README.md](../README.md) for setup instructions

## Supported Languages
- English (en)
- French (fr)  
- Bota Land dialect (bota)

Language files: `src/i18n/locales/`

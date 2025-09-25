# Contributing to NYC Subway Live Map

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/nyc-subway-map.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature-name`

## Development Setup

1. Copy environment file: `cp .env.example .env`
2. Add your Google Maps API key to `.env`
3. Start development server: `npm run dev`

## Code Style

- Use ESLint and Prettier (run `npm run lint:fix`)
- Follow React functional component patterns
- Use TypeScript for type definitions
- Use Tailwind CSS for styling
- Add comments for complex logic

## Commit Messages

Use conventional commit format:
- `feat: add new route support`
- `fix: resolve animation glitch`
- `docs: update API documentation`
- `style: improve button styling`
- `refactor: optimize data fetching`

## Pull Request Process

1. Ensure all tests pass: `npm run lint`
2. Update documentation if needed
3. Add a clear description of changes
4. Reference any related issues

## Reporting Issues

When reporting bugs, include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots (if helpful)

## Feature Requests

For new features, please:
- Check existing issues first
- Describe the use case
- Explain the expected behavior
- Consider implementation complexity

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow project guidelines

Thank you for contributing!

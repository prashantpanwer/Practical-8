# Practical-8

Sandbox Package Installer A Node.js script that programmatically installs packages into an isolated sandbox folder with deterministic package-lock.json and verifies the installed tree checksum.

Features

✅ Isolated Installation: Creates isolated node_modules in ./sandbox

✅ Deterministic Lockfile: Generates consistent package-lock.json

✅ Tree Verification: Generates and verifies SHA256 checksums

✅ Programmatic Control: Full npm CLI integration

✅ Version Specific: Install exact package versions Requirements Node.js 18.0.0+ npm (comes with Node.js) Usage Basic Usage

import { SandboxInstaller } from './sandbox-installer.js';

const installer = new SandboxInstaller(); const result = await installer.install('lodash', '4.17.21');

if (result.success) { console.log(Installed with checksum: ${result.checksum}); }

Command Line Usage

Run the main script (installs test packages)
node sandbox-installer.js

Run tests
npm test

Install specific packages
npm run install:lodash npm run install:express API Reference SandboxInstaller Main class for sandbox package installation.

Methods install(packageName, version) - Install a package with specific version generateTreeChecksum() - Generate SHA256 checksum of package tree verifyTreeChecksum(expectedChecksum) - Verify tree checksum getPackageInfo() - Get information about installed packages Example const installer = new SandboxInstaller();

// Install package const result = await installer.install('express', '4.18.2');

// Verify installation if (result.success) { const verification = installer.verifyTreeChecksum(result.checksum); console.log(Verification: ${verification ? 'PASSED' : 'FAILED'}); } How It Works Sandbox Setup: Creates isolated ./sandbox directory Package.json Creation: Generates package.json with specific package version npm Install: Uses npm CLI to install package and generate package-lock.json Tree Analysis: Extracts deterministic dependency tree structure Checksum Generation: Creates SHA256 hash of the package tree Verification: Validates checksum consistency


import { execSync, spawn } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

/**
 * Sandbox Package Installer
 * Creates an isolated node_modules in ./sandbox and installs packages programmatically
 */
class SandboxInstaller {
  constructor() {
    this.sandboxDir = join(__dirname, 'sandbox');
    this.packageJsonPath = join(this.sandboxDir, 'package.json');
    this.packageLockPath = join(this.sandboxDir, 'package-lock.json');
    this.nodeModulesPath = join(this.sandboxDir, 'node_modules');
  }

  /**
   * Clean and create sandbox directory
   */
  setupSandbox() {
    console.log('🧹 Setting up sandbox directory...');
    
    // Remove existing sandbox if it exists
    if (existsSync(this.sandboxDir)) {
      rmSync(this.sandboxDir, { recursive: true, force: true });
    }
    
    // Create fresh sandbox directory
    mkdirSync(this.sandboxDir, { recursive: true });
    console.log(`✅ Sandbox directory created at: ${this.sandboxDir}`);
  }

  /**
   * Create package.json for the sandbox
   * @param {string} packageName - Name of the package to install
   * @param {string} version - Specific version to install
   */
  createPackageJson(packageName, version) {
    console.log(`📦 Creating package.json for ${packageName}@${version}...`);
    
    const packageJson = {
      name: `sandbox-${packageName}`,
      version: '1.0.0',
      description: `Sandbox installation of ${packageName}`,
      private: true,
      dependencies: {
        [packageName]: version
      },
      engines: {
        node: '>=18.0.0'
      }
    };

    writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json created');
  }

  /**
   * Install package using npm CLI programmatically
   * @param {string} packageName - Name of the package to install
   * @param {string} version - Specific version to install
   */
  async installPackage(packageName, version) {
    console.log(`📥 Installing ${packageName}@${version}...`);
    
    try {
      // Use npm install with specific version
      const installCommand = `npm install ${packageName}@${version} --package-lock-only --no-audit --no-fund`;
      
      console.log(`Running: ${installCommand}`);
      
      // Execute npm install in the sandbox directory
      execSync(installCommand, {
        cwd: this.sandboxDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NPM_CONFIG_PACKAGE_LOCK_ONLY: 'true',
          NPM_CONFIG_AUDIT: 'false',
          NPM_CONFIG_FUND: 'false'
        }
      });

      console.log('✅ Package installed successfully');
      
      // Verify package-lock.json was created
      if (existsSync(this.packageLockPath)) {
        console.log('✅ package-lock.json generated');
        return true;
      } else {
        throw new Error('package-lock.json was not created');
      }
      
    } catch (error) {
      console.error('❌ Installation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate checksum for the installed package tree
   * @returns {string} - SHA256 checksum of the package tree
   */
  generateTreeChecksum() {
    console.log('🔍 Generating tree checksum...');
    
    if (!existsSync(this.packageLockPath)) {
      throw new Error('package-lock.json not found');
    }

    // Read package-lock.json content
    const lockFileContent = readFileSync(this.packageLockPath, 'utf8');
    
    // Parse the lock file to get dependency tree
    const lockData = JSON.parse(lockFileContent);
    
    // Create a deterministic representation of the dependency tree
    const treeStructure = this.extractTreeStructure(lockData);
    
    // Generate checksum
    const hash = createHash('sha256');
    hash.update(JSON.stringify(treeStructure, null, 0));
    const checksum = hash.digest('hex');
    
    console.log(`✅ Tree checksum generated: ${checksum}`);
    return checksum;
  }

  /**
   * Extract deterministic tree structure from package-lock.json
   * @param {Object} lockData - Parsed package-lock.json data
   * @returns {Object} - Deterministic tree structure
   */
  extractTreeStructure(lockData) {
    const tree = {};
    
    // Extract packages with their versions and integrity
    if (lockData.packages) {
      Object.keys(lockData.packages).forEach(packagePath => {
        const pkg = lockData.packages[packagePath];
        if (pkg.name && pkg.version) {
          tree[packagePath] = {
            name: pkg.name,
            version: pkg.version,
            integrity: pkg.integrity || null,
            resolved: pkg.resolved || null
          };
        }
      });
    }
    
    // Sort keys for deterministic output
    const sortedTree = {};
    Object.keys(tree).sort().forEach(key => {
      sortedTree[key] = tree[key];
    });
    
    return {
      lockfileVersion: lockData.lockfileVersion,
      packages: sortedTree,
      dependencies: lockData.dependencies || {}
    };
  }

  /**
   * Verify the installed package tree
   * @param {string} expectedChecksum - Expected checksum to verify against
   * @returns {boolean} - True if checksum matches
   */
  verifyTreeChecksum(expectedChecksum) {
    console.log('🔍 Verifying tree checksum...');
    
    const actualChecksum = this.generateTreeChecksum();
    
    if (actualChecksum === expectedChecksum) {
      console.log('✅ Tree checksum verification passed');
      return true;
    } else {
      console.log(`❌ Tree checksum verification failed`);
      console.log(`Expected: ${expectedChecksum}`);
      console.log(`Actual:   ${actualChecksum}`);
      return false;
    }
  }

  /**
   * Get package information from the installed tree
   * @returns {Object} - Package information
   */
  getPackageInfo() {
    if (!existsSync(this.packageLockPath)) {
      throw new Error('package-lock.json not found');
    }

    const lockData = JSON.parse(readFileSync(this.packageLockPath, 'utf8'));
    
    return {
      lockfileVersion: lockData.lockfileVersion,
      totalPackages: Object.keys(lockData.packages || {}).length,
      dependencies: lockData.dependencies || {}
    };
  }

  /**
   * Main installation process
   * @param {string} packageName - Name of the package to install
   * @param {string} version - Specific version to install
   * @returns {Object} - Installation result with checksum
   */
  async install(packageName, version) {
    console.log(`🚀 Starting sandbox installation of ${packageName}@${version}\n`);
    
    try {
      // Step 1: Setup sandbox
      this.setupSandbox();
      
      // Step 2: Create package.json
      this.createPackageJson(packageName, version);
      
      // Step 3: Install package
      await this.installPackage(packageName, version);
      
      // Step 4: Generate checksum
      const checksum = this.generateTreeChecksum();
      
      // Step 5: Get package info
      const packageInfo = this.getPackageInfo();
      
      console.log('\n📊 Installation Summary:');
      console.log(`Package: ${packageName}@${version}`);
      console.log(`Lockfile Version: ${packageInfo.lockfileVersion}`);
      console.log(`Total Packages: ${packageInfo.totalPackages}`);
      console.log(`Tree Checksum: ${checksum}`);
      console.log(`Sandbox Location: ${this.sandboxDir}`);
      
      return {
        success: true,
        packageName,
        version,
        checksum,
        packageInfo,
        sandboxDir: this.sandboxDir
      };
      
    } catch (error) {
      console.error('\n❌ Installation failed:', error.message);
      return {
        success: false,
        error: error.message,
        packageName,
        version
      };
    }
  }
}

// Example usage and testing
async function main() {
  const installer = new SandboxInstaller();
  
  // Test with different packages
  const testPackages = [
    { name: 'lodash', version: '4.17.21' },
    { name: 'express', version: '4.18.2' },
    { name: 'axios', version: '1.6.0' }
  ];
  
  console.log('🧪 Testing sandbox installer with multiple packages...\n');
  
  for (const pkg of testPackages) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${pkg.name}@${pkg.version}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await installer.install(pkg.name, pkg.version);
    
    if (result.success) {
      console.log(`\n✅ Successfully installed ${pkg.name}@${pkg.version}`);
      console.log(`Checksum: ${result.checksum}`);
      
      // Verify the checksum
      const verification = installer.verifyTreeChecksum(result.checksum);
      console.log(`Verification: ${verification ? 'PASSED' : 'FAILED'}`);
    } else {
      console.log(`\n❌ Failed to install ${pkg.name}@${pkg.version}`);
      console.log(`Error: ${result.error}`);
    }
    
    console.log('\n' + '-'.repeat(60));
  }
}

// Export the class for use in other modules
export { SandboxInstaller };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

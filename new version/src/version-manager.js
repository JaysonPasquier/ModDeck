const fs = require('fs');
const path = require('path');
const https = require('https');

class VersionManager {
    constructor() {
        this.currentVersion = '1.0.0';
        this.githubRepo = 'JaysonPasquier/ModDeck';
        this.changelogPath = 'new%20version/changelog';
        this.baseUrl = `https://api.github.com/repos/${this.githubRepo}/contents/${this.changelogPath}`;
        this.rawUrl = `https://raw.githubusercontent.com/${this.githubRepo}/main/new%20version/changelog`;
        this.downloadUrl = `https://raw.githubusercontent.com/${this.githubRepo}/main/new%20version`;
    }

    // Get current version from package.json
    getCurrentVersion() {
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            this.currentVersion = packageJson.version;
            return this.currentVersion;
        } catch (error) {
            console.error('Failed to read current version:', error);
            return this.currentVersion;
        }
    }

    // Extract version number from filename (e.g., "v1.md" -> "1.0.0")
    parseVersionFromFilename(filename) {
        const match = filename.match(/^v(\d+)\.md$/);
        if (match) {
            return `${match[1]}.0.0`;
        }
        return null;
    }

    // Compare version strings (semver style)
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;

            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        return 0;
    }

    // Fetch changelog files from GitHub
    async fetchChangelogFiles() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: `/repos/${this.githubRepo}/contents/${this.changelogPath}`,
                headers: {
                    'User-Agent': 'ModDeck-Version-Checker'
                }
            };

            const req = https.get(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const files = JSON.parse(data);
                        if (Array.isArray(files)) {
                            resolve(files.filter(file => file.name.endsWith('.md')));
                        } else {
                            reject(new Error('Invalid response format'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Check for available updates
    async checkForUpdates() {
        try {
            const currentVersion = this.getCurrentVersion();
            const files = await this.fetchChangelogFiles();

            const versions = files
                .map(file => ({
                    filename: file.name,
                    version: this.parseVersionFromFilename(file.name),
                    downloadUrl: file.download_url
                }))
                .filter(item => item.version !== null)
                .sort((a, b) => this.compareVersions(b.version, a.version)); // Sort newest first

            const latestVersion = versions.length > 0 ? versions[0] : null;

            if (latestVersion && this.compareVersions(latestVersion.version, currentVersion) > 0) {
                return {
                    hasUpdate: true,
                    currentVersion,
                    latestVersion: latestVersion.version,
                    changelogFile: latestVersion.filename,
                    changelogUrl: latestVersion.downloadUrl,
                    allVersions: versions
                };
            }

            return {
                hasUpdate: false,
                currentVersion,
                latestVersion: currentVersion,
                allVersions: versions
            };
        } catch (error) {
            console.error('Failed to check for updates:', error);
            throw error;
        }
    }

    // Download changelog content
    async downloadChangelog(changelogUrl) {
        return new Promise((resolve, reject) => {
            https.get(changelogUrl, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data);
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    // Parse changelog to extract file changes
    parseChangelog(changelogContent) {
        const lines = changelogContent.split('\n');
        const changes = {
            newFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
            description: ''
        };

        let currentSection = null;
        let description = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Extract description (everything before file changes)
            if (!trimmedLine.startsWith('## Files') && !currentSection) {
                description.push(line);
                continue;
            }

            // Detect file change sections
            if (trimmedLine.startsWith('## Files Added') || trimmedLine.startsWith('### Files Added')) {
                currentSection = 'newFiles';
                continue;
            } else if (trimmedLine.startsWith('## Files Modified') || trimmedLine.startsWith('### Files Modified')) {
                currentSection = 'modifiedFiles';
                continue;
            } else if (trimmedLine.startsWith('## Files Deleted') || trimmedLine.startsWith('### Files Deleted')) {
                currentSection = 'deletedFiles';
                continue;
            }

            // Parse file paths
            if (currentSection && trimmedLine.startsWith('- ')) {
                const filePath = trimmedLine.substring(2).trim();
                changes[currentSection].push(filePath);
            }
        }

        changes.description = description.join('\n').trim();
        return changes;
    }

    // Download a file from GitHub
    async downloadFile(relativePath, destinationPath) {
        const url = `${this.downloadUrl}/${relativePath}`;

        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download ${relativePath}: ${res.statusCode}`));
                    return;
                }

                // Ensure destination directory exists
                const dir = path.dirname(destinationPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                const fileStream = fs.createWriteStream(destinationPath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });

                fileStream.on('error', (error) => {
                    fs.unlink(destinationPath, () => {}); // Clean up partial file
                    reject(error);
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    // Apply update based on changelog
    async applyUpdate(updateInfo) {
        try {
            const changelogContent = await this.downloadChangelog(updateInfo.changelogUrl);
            const changes = this.parseChangelog(changelogContent);

            const results = {
                success: true,
                filesProcessed: 0,
                errors: [],
                changes: changes
            };

            const appRoot = path.join(__dirname, '..');

            // Download new files
            for (const filePath of changes.newFiles) {
                try {
                    const destinationPath = path.join(appRoot, filePath);
                    await this.downloadFile(filePath, destinationPath);
                    results.filesProcessed++;
                    console.log(`Downloaded new file: ${filePath}`);
                } catch (error) {
                    console.error(`Failed to download ${filePath}:`, error);
                    results.errors.push(`Failed to download ${filePath}: ${error.message}`);
                }
            }

            // Download modified files
            for (const filePath of changes.modifiedFiles) {
                try {
                    const destinationPath = path.join(appRoot, filePath);

                    // Backup existing file
                    if (fs.existsSync(destinationPath)) {
                        const backupPath = `${destinationPath}.backup`;
                        fs.copyFileSync(destinationPath, backupPath);
                    }

                    await this.downloadFile(filePath, destinationPath);
                    results.filesProcessed++;
                    console.log(`Updated file: ${filePath}`);
                } catch (error) {
                    console.error(`Failed to update ${filePath}:`, error);
                    results.errors.push(`Failed to update ${filePath}: ${error.message}`);
                }
            }

            // Delete files (be careful with this)
            for (const filePath of changes.deletedFiles) {
                try {
                    const fullPath = path.join(appRoot, filePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        results.filesProcessed++;
                        console.log(`Deleted file: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`Failed to delete ${filePath}:`, error);
                    results.errors.push(`Failed to delete ${filePath}: ${error.message}`);
                }
            }

            // Update package.json version
            try {
                const packagePath = path.join(appRoot, 'package.json');
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                packageJson.version = updateInfo.latestVersion;
                fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
                console.log(`Updated version to ${updateInfo.latestVersion}`);
            } catch (error) {
                console.error('Failed to update package.json version:', error);
                results.errors.push(`Failed to update version: ${error.message}`);
            }

            if (results.errors.length > 0) {
                results.success = false;
            }

            return results;
        } catch (error) {
            console.error('Failed to apply update:', error);
            throw error;
        }
    }
}

module.exports = VersionManager;

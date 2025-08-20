/**
 * Build script for zed-vscode-icons-theme
 *
 * This script:
 * 1. Downloads the latest vscode-icons VSIX package
 * 2. Extracts the icon files and manifest
 * 3. Converts the manifest to the Zed icon theme format
 * 4. Saves the converted manifest and copies the icons
 */

import { mkdir, readFile, writeFile, copyFile, cp, rm } from "fs/promises";
import { join, basename, dirname, resolve } from "path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import axios from "axios";
import extract from "extract-zip";

// Types for VSCode icons manifest
interface IconDefinition {
  iconPath: string;
}

interface VSCodeIconsManifest {
  iconDefinitions: Record<string, IconDefinition>;
  folder: string;
  folderExpanded: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  languageIds?: Record<string, string>;
  light?: {
    folder?: string;
    folderExpanded?: string;
    fileExtensions?: Record<string, string>;
    fileNames?: Record<string, string>;
    languageIds?: Record<string, string>;
  };
}

/// Interface for Zed icon theme variant
interface ZedIconThemeVariant {
  name: string;
  appearance: "dark" | "light";
  directory_icons?: {
    collapsed: string | null;
    expanded: string | null;
  };
  file_stems: Record<string, string>;
  file_suffixes: Record<string, string>;
  file_icons: Record<string, { path: string }>;
}

// Types for Zed icon theme
interface ZedIconTheme {
  $schema: string;
  name: string;
  author: string;
  themes: Array<ZedIconThemeVariant>;
}

/**
 * Get the latest release version from GitHub
 */
async function getLatestRelease(): Promise<string> {
  try {
    console.log("Fetching latest release information...");
    const response = await axios.get(
      "https://api.github.com/repos/vscode-icons/vscode-icons/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const version = response.data.tag_name;
    console.log(`Latest version: ${version}`);
    return version;
  } catch (error) {
    console.error("Failed to fetch latest release:", error);
    throw error;
  }
}

/**
 * Download the VSIX file
 */
async function downloadVsix(version: string, outputPath: string): Promise<string> {
  // Clean version (remove 'v' prefix if present)
  const cleanVersion = version.startsWith("v") ? version.substring(1) : version;
  const vsixUrl = `https://github.com/vscode-icons/vscode-icons/releases/download/${version}/vscode-icons-${cleanVersion}.vsix`;
  const vsixPath = join(outputPath, `vscode-icons-${cleanVersion}.vsix`);

  console.log(`Downloading VSIX from: ${vsixUrl}`);

  try {
    const response = await axios({
      method: "get",
      url: vsixUrl,
      responseType: "stream",
    });

    const writer = require("fs").createWriteStream(vsixPath);
    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on("finish", () => resolve(vsixPath));
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Failed to download VSIX:", error);
    throw error;
  }
}

/**
 * Extract the VSIX file
 */
async function extractVsix(vsixPath: string, extractPath: string): Promise<void> {
  console.log(`Extracting VSIX to: ${extractPath}`);
  try {
    await extract(vsixPath, { dir: extractPath });
    console.log("Extraction completed!");
  } catch (error) {
    console.error("Failed to extract VSIX:", error);
    throw error;
  }
}

/**
 * Process language IDs and add them to the file_icons object
 *
 * This function takes the language ID mappings from the VSCode manifest
 * and adds them as direct entries in the Zed theme's file_icons object
 *
 * @param languageIds The languageIds mapping from the VSCode manifest
 * @param iconDefinitions The icon definitions from the VSCode manifest
 * @param fileIcons The target file_icons object in the Zed theme
 */
function processLanguageIds(
  languageIds: Record<string, string> | undefined,
  iconDefinitions: Record<string, IconDefinition>,
  fileIcons: Record<string, { path: string }>
): void {
  if (!languageIds) return;

  Object.entries(languageIds).forEach(([langId, iconId]) => {
    // Skip if the language ID already exists as a key in fileIcons
    if (fileIcons[langId]) return;

    // Get the corresponding icon definition
    const iconDef = iconDefinitions[iconId];
    if (!iconDef || !iconDef.iconPath) return;

    // Extract the icon file name from the path
    const iconFileName = iconDef.iconPath.substring(iconDef.iconPath.lastIndexOf("/") + 1);

    // Add a new entry in fileIcons with the language ID as the key
    fileIcons[langId] = {
      path: `./icons/${iconFileName}`,
    };
  });
}

/**
 * Convert the VSCode icons manifest to Zed icon theme format
 */
function convertManifest(vsManifest: VSCodeIconsManifest): ZedIconTheme {
  console.log("Converting manifest format...");

  // Create the base Zed icon theme structure
  const zedManifest: ZedIconTheme = {
    $schema: "https://zed.dev/schema/icon_themes/v0.2.0.json",
    name: "VSCode Icons Theme",
    author: "Chawye Hsu",
    themes: [],
  };

  const darkTheme: ZedIconThemeVariant = {
    name: "VSCode Icons",
    appearance: "dark",
    directory_icons: {
      collapsed: null,
      expanded: null,
    },
    file_stems: {},
    file_suffixes: {},
    file_icons: {},
  };

  // Process default directory icons
  const folderIcon = vsManifest.folder;
  const folderExpandedIcon = vsManifest.folderExpanded;

  if (folderIcon && vsManifest.iconDefinitions[folderIcon]) {
    const iconPath = vsManifest.iconDefinitions[folderIcon].iconPath;
    const fileName = iconPath.substring(iconPath.lastIndexOf("/") + 1);
    darkTheme.directory_icons!.collapsed = fileName.length > 0 ? `./icons/${fileName}` : null;
  }

  if (folderExpandedIcon && vsManifest.iconDefinitions[folderExpandedIcon]) {
    const iconPath = vsManifest.iconDefinitions[folderExpandedIcon].iconPath;
    const fileName = iconPath.substring(iconPath.lastIndexOf("/") + 1);
    darkTheme.directory_icons!.expanded = fileName.length > 0 ? `./icons/${fileName}` : null;
  }

  // Process file stems (file names)
  if (vsManifest.fileNames) {
    Object.entries(vsManifest.fileNames).forEach(([fileName, iconId]) => {
      darkTheme.file_stems[fileName] = iconId;
    });
  }

  // Process file suffixes (file extensions)
  if (vsManifest.fileExtensions) {
    Object.entries(vsManifest.fileExtensions).forEach(([ext, iconId]) => {
      darkTheme.file_suffixes[ext] = iconId;
    });
  }

  // Process icon definitions
  Object.entries(vsManifest.iconDefinitions).forEach(([iconId, definition]) => {
    if (definition.iconPath) {
      const iconFileName = definition.iconPath.substring(definition.iconPath.lastIndexOf("/") + 1);
      darkTheme.file_icons[iconId] = {
        path: `./icons/${iconFileName}`,
      };
    }
  });

  // Process language IDs
  processLanguageIds(vsManifest.languageIds, vsManifest.iconDefinitions, darkTheme.file_icons);

  // Add the dark theme to the themes array
  zedManifest.themes.push(darkTheme);

  // Add light theme if it exists in the source
  if (vsManifest.light) {
    // Create a new light theme object with proper typing
    const lightTheme: ZedIconThemeVariant = {
      name: "VSCode Icons Light",
      appearance: "light",
      directory_icons: {
        collapsed: null,
        expanded: null,
      },
      file_stems: {},
      file_suffixes: {},
      file_icons: {},
    }

    const light = vsManifest.light;

    // Process light directory icons
    if (light.folder && vsManifest.iconDefinitions[light.folder]) {
      const iconPath = vsManifest.iconDefinitions[light.folder]!.iconPath;
      const fileName = iconPath.substring(iconPath.lastIndexOf("/") + 1);
      lightTheme.directory_icons!.collapsed = fileName.length > 0 ? `./icons/${fileName}` : darkTheme.directory_icons!.collapsed;
    }

    if (
      light.folderExpanded &&
      vsManifest.iconDefinitions[light.folderExpanded]
    ) {
      const iconPath = vsManifest.iconDefinitions[light.folderExpanded]!.iconPath;
      const fileName = iconPath.substring(iconPath.lastIndexOf("/") + 1);
      lightTheme.directory_icons!.expanded = fileName.length > 0 ? `./icons/${fileName}` : darkTheme.directory_icons!.expanded;
    }

    // Process file stems (file names)
    if (light.fileNames) {
      Object.entries(light.fileNames).forEach(([fileName, iconId]) => {
        lightTheme.file_stems[fileName] = iconId;
      });
    }

    // Process file suffixes (file extensions)
    if (light.fileExtensions) {
      Object.entries(light.fileExtensions).forEach(([ext, iconId]) => {
        lightTheme.file_suffixes[ext] = iconId;
      });
    }

    // Process icon definitions
    Object.entries(vsManifest.iconDefinitions).forEach(([iconId, definition]) => {
      if (definition.iconPath) {
        const iconFileName = definition.iconPath.substring(definition.iconPath.lastIndexOf("/") + 1);
        lightTheme.file_icons[iconId] = {
          path: `./icons/${iconFileName}`,
        };
      }
    });

    // Process language IDs
    if (light.languageIds) {
      processLanguageIds(light.languageIds, vsManifest.iconDefinitions, lightTheme.file_icons);
    }

    // Add light theme to the themes array
    zedManifest.themes.push(lightTheme);
  }

  return zedManifest;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(source: string, destination: string): Promise<void> {
  try {
    await mkdir(destination, { recursive: true });
    await cp(source, destination, { recursive: true });
    console.log(`Copied directory from ${source} to ${destination}`);
  } catch (error) {
    console.error(`Error copying directory: ${error}`);
    throw error;
  }
}

/**
 * Main build function
 */
async function main() {
  try {
    console.log("Building zed-vscode-icons-theme...");

    // Create a temporary directory
    const tempDir = join(tmpdir(), `zed-vscode-icons-theme-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    console.log(`Created temporary directory: ${tempDir}`);

    // Get the latest release version
    const version = await getLatestRelease();

    // Download the VSIX file
    const vsixPath = await downloadVsix(version, tempDir);

    // Extract the VSIX file
    const extractPath = join(tempDir, "extracted");
    await mkdir(extractPath, { recursive: true });
    await extractVsix(vsixPath, extractPath);

    // Paths to the extracted files
    const manifestPath = join(extractPath, "extension", "dist", "src", "vsicons-icon-theme.json");
    const iconsDir = join(extractPath, "extension", "icons");

    // Read the manifest file
    const manifestContent = await readFile(manifestPath, "utf8");
    const vsManifest: VSCodeIconsManifest = JSON.parse(manifestContent);

    // Convert manifest to Zed format
    const zedManifest = convertManifest(vsManifest);

    // Create output directories
    const projectRoot = process.cwd();
    const outputIconsDir = join(projectRoot, "icons");
    const outputManifestDir = join(projectRoot, "icon_themes");

    // Ensure directories exist
    await mkdir(outputIconsDir, { recursive: true });
    await mkdir(outputManifestDir, { recursive: true });

    // Copy icons directory
    console.log("Copying icon files...");
    await copyDirectory(iconsDir, outputIconsDir);

    // Save the converted manifest
    const outputManifestPath = join(outputManifestDir, "vscode-icons-theme.json");
    await writeFile(outputManifestPath, JSON.stringify(zedManifest, null, 2), "utf8");
    console.log(`Saved manifest to ${outputManifestPath}`);

    // Write/update the version file
    const versionFilePath = join(projectRoot, "version");
    await writeFile(versionFilePath, version, "utf8");
    console.log(`Updated version file with ${version}`);

    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${tempDir}`);

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);

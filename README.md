# zed-vscode-icons-theme

The VSCode Icons theme for [Zed](https://zed.dev) editor. This theme port brings the popular [vscode-icons](https://github.com/vscode-icons/vscode-icons) to Zed.

![Preview](https://github.com/user-attachments/assets/5a9fac04-b954-42a0-9172-2506254d78f9)

## Features

- Comprehensive icon set for files and directories
- Supports both dark and light themes
- Automatically updates with the latest vscode-icons releases
- Complete file type coverage

## Installation

This icons theme has been submitted to the [Zed Extension store], you may install from there.

Or you may install from the repository:

1. Clone this repository
2. Run the build script to generate the theme
3. Install the theme in Zed

```bash
# Clone the repository
git clone https://github.com/chawyehsu/zed-vscode-icons-theme
cd zed-vscode-icons-theme

# Install Dev Extension in Zed, navigate to the directory
```

After installation, update Zed `settings.json` to use the icons theme:

```jsonc
{
  "icon_theme": {
    "mode": "system",
    "dark": "VSCode Icons",
    "light": "VSCode Icons Light"
  },
  // Enable icons for tabs
  "tabs": {
    "file_icons": true
  }
}
```

## Development

To modify or contribute to this theme:

```bash
# Install dependencies
bun install

# Build the theme
bun run build
```

## Credits

- [vscode-icons](https://github.com/vscode-icons/vscode-icons) - The original icon set for VS Code
- [Zed](https://zed.dev) - The fast, multiplayer code editor

## License

**zed-vscode-icons-theme** © [Chawye Hsu](https://github.com/chawyehsu). Released under the [MIT](LICENSE) license.
For the license of `vscode-icons`, please refer to its repo.

> [Blog](https://chawyehsu.com) · GitHub [@chawyehsu](https://github.com/chawyehsu) · Twitter [@chawyehsu](https://twitter.com/chawyehsu)


[Zed Extension store]: https://zed.dev/extensions?query=chawyehsu-vscode-icons&filter=icon-themes

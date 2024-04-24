# Extra⭐ features for GitHub Actions

✨ Enables additional `action.yml` features through the power of codegen

<table align=center><td>

```yml
# action.yml
# 🎉 Finally you can specify env vars in `action.yml`!
env:
  RUST_BACKTRACE: ${{ runner.debug }}
# 🧙‍♂️ Adds magic to support more runtimes!
runs:
  using: wasmtime19 # 👇 Scroll down for available runtimes.
  main: target/wasm32-wasi/hello-world.wasm
# 🎉 Your feature here! Open an issue!
```

<tr><td>

```yml
# In your `publish-action.yml` and `test-action.yml`...
- uses: ./ # ❌ Doesn't work; not yet down-leveled.
  continue-on-error: true
- uses: jcbhmr/configure-action-extra@v1
- uses: ./ # ✅ Works natively!
```

</table>

<p align=center>
  <a href="#">🦀 Write your GitHub Actions in Rust</a>
  | <a href="#">🐿️ Write your GitHub Actions in Go</a>
  <br>
  <a href="#wasmtime-runtime">Wasmtime runtime</a>
  | <a href="#python-runtime">Python runtime</a>
  | <a href="#native-runtime">Native runtime</a>
  | <a href="https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#runs">Official runtimes</a>
  <br>
  <a href="https://github.com/jcbhmr/go-actions-toolkit">Toolkit library for Go</a>
  | <a href="https://github.com/jcbhmr/actions-toolkit-rs">Toolkit library for Rust</a>
  | <a href="https://github.com/actions/toolkit">Official toolkit library for JavaScript</a>
</p>

🧙‍♂️ Uses codegen magic to support ⭐extra runtimes \
🔧 Supports setting `env` variables \
🧰 Designed to be part of the build pipeline; runs right before publish \
🤝 Works great with [jcbhmr/go-actions-toolkit](https://github.com/jcbhmr/go-actions-toolkit) for Go-based actions \
🤝 Works great with [jcbhmr/actions-toolkit-rs](https://github.com/jcbhmr/actions-toolkit-rs) for Rust-based actions

## Installation

![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)

There's nothing to install! 🚀 Just `- uses: jcbhmr/configure-action-extra@v1` somewhere before you publish or `- uses: ./` and you're all set!

<!--<details><summary>💻 Want to install it and run the codegen locally? You can!</summary>

![npm](https://img.shields.io/static/v1?style=for-the-badge&message=npm&color=CB3837&logo=npm&logoColor=FFFFFF&label=)
![pnpm](https://img.shields.io/static/v1?style=for-the-badge&message=pnpm&color=222222&logo=pnpm&logoColor=F69220&label=)
![Yarn](https://img.shields.io/static/v1?style=for-the-badge&message=Yarn&color=2C8EBB&logo=Yarn&logoColor=FFFFFF&label=)
![Bun](https://img.shields.io/static/v1?style=for-the-badge&message=Bun&color=000000&logo=Bun&logoColor=FFFFFF&label=)

Use your favorite npm package manager to install the CLI tool globally. Then you can run `configure-action-extra` to codegen the native `action.yml` locally instead of in GitHub Actions CI.

```sh
npm install --global @jcbhmr/configure-action-extra
```

</details>-->

## Usage

![YAML](https://img.shields.io/static/v1?style=for-the-badge&message=YAML&color=CB171E&logo=YAML&logoColor=FFFFFF&label=)
![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)

```yml

```

```yml
# .github/workflows/publish-action.yml
name: publish-action
on:
  releases:
    type: [released]
concurrency: ${{ github.workflow }}
jobs:
  publish-action:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Run your build step somewhere. Before or after; doesn't matter."
      - uses: jcbhmr/configure-action-extra@v1 # 👈 This is what does the magic!
      - uses: jcbhmr/publish-action@v1
```

### Wasmtime runtime

```yml
- uses: dtolnay/rust-toolchain@stable
  with:
    targets: wasm32-wasi
- uses: Swatinem/rust-cache@v2
- run: cargo build --target wasm32-wasi
```

### Bash runtime

Uses Bash v5 (even on macOS!) 

### Python runtime

### Native runtime

This runtime just runs the file that you give it as though it were an executable file. **This 

<details>

# Configure executable action

👨‍💻 Write your GitHub Action in any language that compiles to a binary

<table align=center><td>

```yml
# action.yml
runs:
  using: executable
  main:
    windows-x64: .out/main-windows-amd64.exe
    macos-x64: .out/main-darwin-amd64
    macos-arm64: .out/main-darwin-arm64
    linux-x64: .out/main-linux-amd64
    linux-arm64: .out/main-linux-arm64
```

</table>

## Usage

```yml
# action.yml
runs:
  using: executable
  main:
    windows-x64: main-windows.exe
    linux-x64: main-linux
    macos-x64: main-macos
```

```yml
# .github/workflows/publish-action.yml
name: publish-action
on:
  release:
    types: released
jobs:
  publish-action:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          GOOS=windows GOARCH=amd64 go build main.go -o main-windows.exe
          GOOS=linux GOARCH=amd64 go build main.go -o main-linux
          GOOS=darwin GOARCH=amd64 go build main.go -o main-macos
      - uses: jcbhmr/configure-executable-action@v1
      - uses: jcbhmr/update-release@v1
      - uses: actions/publish-action@v0.2.2
        with:
          source-tag: ${{ github.event.release.tag_name }}
```

If you have a Bash-like script with a shebang like `#!/bin/bash` that can run on all platforms
(Windows uses Git Bash to interpret the `#!`) you can just specify a `main: main.sh` instead of a map.

```yml
# action.yml
runs:
  using: executable
  main: main.sh
```

## How it works

We add some `_main.mjs`/`_pre.mjs`/`_post.mjs` wrapper files and edit the `action.yml` file to use those
`_*.mjs` files using the Node.js runtime. Then, those `_*.mjs` files just `spawn()` the appropriate executable for the current OS/architecture. All the `INPUT_*` and `GITHUB_*` environment variables are passed through untouched.

1. You edit some code.
2. You create a new release like `v1.2.3`. The `v1` tag **still points to `v1.2.2`**. No users are using the `v1.2.3` tag yet.
3. GitHub workflow triggers on that release. Still no users are using the `v1.2.3` tag. The "New version released" notification is in the process of being sent now.
4. jcbhmr/configure-executable-action and jcbhmr/update-release are run updating the commit that the released tag points to to be the commit that includes the compiled binaries. No users are using the `v1.2.3` tag yet.
5. actions/publish-action is run which **updates the `v1` tag to point to the `v1.2.3` tag**. Now users are using the new version **which now includes the compiled binaries**.

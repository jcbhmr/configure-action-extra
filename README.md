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

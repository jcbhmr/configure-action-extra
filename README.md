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

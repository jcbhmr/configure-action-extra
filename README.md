## Usage

```yml
# .github/workflows/test-action.yml
name: Test action
on:
  push:
    branches: "main"
  pull_request:
jobs:
  test-action:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno compile -Ao main main.ts
      - uses: jcbhmr/configure-executable-action@v1
        with:
          main: main
      - id: main
        uses: ./
      - shell: jq -C . {0}
        run: ${{ toJSON(steps.main.outputs) }}
```

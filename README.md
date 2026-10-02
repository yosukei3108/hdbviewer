# HDB Viewer

A read-only VS Code custom editor that displays the contents of a
Tokyo Cabinet hash database (`*.tch`, `*.hdb`) as a table.

## Requirements

- `tchmgr` (from Tokyo Cabinet) must be installed.
  If it is not on your `PATH`, set `hdbviewer.tchmgrPath`.

## Usage

- Open a `*.tch` or `*.hdb` file. It opens in HDB Viewer by default.
- Or run **HDB Viewer: Open Hash DB** from the Command Palette.

## Features

- **Filter**: Load only records whose key starts with the given prefix
  (`tchmgr list -fm`). Press Enter or click **Filter**.
- **Search**: Find text in the keys and values of the records on the
  current page. Non-matching rows are hidden.
- **Paging**: Use **Prev** / **Next** to move between pages.
- **Reload**: Re-read the current page from the file.
- **DB Info**: Show the output of `tchmgr inform`.

## Extension Settings

| Setting | Default | Description |
| --- | --- | --- |
| `hdbviewer.tchmgrPath` | `tchmgr` | Path to the `tchmgr` command. |
| `hdbviewer.recordsPerPage` | `100` | Number of records per page. |
| `hdbviewer.noLock` | `false` | Read without a file lock (`-nl`). When `false`, do not wait for the lock (`-nb`). |

## Known Limitations

- The extension is read-only. It cannot edit records.
- Keys and values are shown as UTF-8 text. Binary data may look garbled.
- Search only looks at the current page. Use Filter to narrow down the whole DB.
- `tchmgr` has no "start from record N" option, so later pages read
  all preceding records first and become slower on large files.

## Development

```sh
npm install
```

Open this folder in VS Code and press F5 to launch the Extension Development Host.

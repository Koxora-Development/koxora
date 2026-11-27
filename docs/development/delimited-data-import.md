# Local CSV and TSV import

The Product Owner accepted this Phase 3 package, and it was merged in [PR #67](https://github.com/Koxora-Development/koxora/pull/67) on 2026-11-26 (`4e6f0fd`). It adds local delimited import for DATA-001, with initial column type detection for DATA-007 and portable source snapshots for DATA-016. [Feature catalog](../product/feature-catalog.md)

## Import and inspect data

1. Open a project and choose **File → Project data…**. In **Import CSV or TSV…**, choose a local file to open the import preview.
2. Review the delimiter, header and suggested column types. Adjust the settings and inspect the preview before choosing **Import dataset**.
3. Open **Saved datasets**, select the imported dataset and page through its rows. Use **Undo** or **Redo** to reverse or restore an import or confirmed removal in one step.

Studio parses the file locally and commits the dataset when the import is confirmed. The preview is bounded, and invalid or oversized data produces feedback before changing the project. Browser and desktop Studio share this workflow in English and German.

## Edit a saved value

Open **File → Project data… → Saved datasets**, select a dataset and click a cell. With the keyboard, Tab into the table, move with the arrow keys and press Enter or Space. Enter a **Cell value** and choose **Save value**. Studio checks the value against the existing text, number, date or boolean column type. Escape or Cancel returns focus to the cell.

For columns that allow missing values, choose **Clear value** and then **Save value** to store null. An empty text string remains a text value. JSON cells are read-only. Changes to row and column structure are separate work.

A changed value is one Undo/Redo step. Dataset and field IDs stay stable, so bound charts update from the changed row. Save and reopen the project to recover the edited value from its stored snapshot. [Charts from project data](data-charts.md)

## Input and storage

The importer reads UTF-8 with or without a BOM and UTF-16LE or UTF-16BE with a BOM. It falls back to Windows-1252 when an unmarked file fails UTF-8 decoding. Automatic delimiter detection compares comma, semicolon and tab. Quoted delimiters, multiline values and doubled quotes are supported. Rows with inconsistent field counts or malformed quotes produce feedback.

Column suggestions recognize strict decimal numbers, `true` and `false`, and dates in `YYYY-MM-DD` form. Empty fields become null. Formula-like strings and ambiguous values such as IDs with leading zeroes default to text. The import limits are 2 MiB per file, 5,000 records including the header, 128 columns, 100,000 cells and 16,384 16-bit code units per cell. Studio checks the existing 8 MiB dataset limit and the full project archive limits before recording the import.

Stored rows and column definitions use the existing `.koxora` dataset schema. Source metadata records the format, encoding, delimiter and header choice. Save and reopen or export and import the project to inspect the same data independently of its source file. Removal checks for declared references across documents and templates, including bindings, filter actions and domain model references. [Project format](../architecture/project-format.md)

To visualize a saved dataset, use the [chart workflow](data-charts.md). Spreadsheet formats and diagram exports are tracked in the [roadmap](../roadmap.md).

## Acceptance scenarios

Save this sample as `requests.csv` to check text, number, date and boolean suggestions.

```csv
Request ID,Amount,Received,Resolved
0012,24.50,2026-11-24,true
0013,18.75,2026-11-25,false
```

- Import a header-based CSV and a headerless TSV. Check quoted delimiters, multiline values and accented text in the preview. Change the delimiter, header setting and a type before confirming. Verify the typed date and numeric values as well as the preserved leading-zero ID and formula-like text.
- Try malformed and oversized files and incompatible column types. Cancel one preview and confirm another. Verify that the dataset list only changes after a successful confirmation.
- Inspect a dataset with more than one page of rows. Undo and redo the import, then save and reopen the project offline without the source file. Export and reopen a `.koxora` archive, and check the column types and row values.
- Remove an unreferenced dataset and undo the removal. Verify that a dataset referenced by existing project content is protected. Repeat the primary workflow with the keyboard in English and German.
- Edit a typed cell used by a chart. Try an invalid value and cancel once, then confirm a valid edit. Verify the cell and chart after Undo, Redo and offline reopening.

# Charts from project data

This Phase 3 package implements the first column and line chart workflows for DATA-008, DATA-009 and DIAG-017. Product Owner acceptance is pending. [Feature catalog](../product/feature-catalog.md)

## Create and edit a chart

1. Open **File → Project data… → Saved datasets**, select a dataset and choose **Create chart…**. A text or boolean category suggests a column chart. A date or number category suggests a line chart.
2. Review the suggested type and title. Choose a category column, a separate numeric value column, a chart type and a **Studio**, **Ocean** or **Warm** color palette. The starting title combines the selected field names. Edit it before choosing **Create chart**.
3. Double-click the chart on the canvas or choose **Edit chart…** from its selection menu. Change the dataset, fields, type, title or palette and choose **Apply**. Move and resize the chart using the ordinary canvas tools.

Studio draws from the first 100 input rows in source order. Empty category values have no label, and missing numeric values leave gaps. Studio reports the displayed count when the dataset exceeds that limit.

Each chart refers to its dataset fields by ID. Supported changes to the stored dataset flow into the chart on render. Saving and reopening a project, including offline, resolves the chart from the stored project snapshot. Dataset editing and external source refresh are later work. The `data-charts-v1` archive profile preserves the chart type, palette and field roles. [Project format](../architecture/project-format.md#dataset-charts)

## Acceptance scenarios

- Import a dataset with text, dates and numeric values. Check the suggested types, choose both chart types manually, edit the title and fields, and try all three palettes.
- Check category order with an unsorted dataset and a missing value. Use more than 100 rows and verify the display count and the source-order limit.
- Move and resize a chart, change its configuration and check Undo and Redo. Reopen the exported `.koxora` project offline and verify its chart and data. Try removing the bound dataset and check that Studio protects the reference.
- Repeat creation and configuration with the keyboard in English and German.

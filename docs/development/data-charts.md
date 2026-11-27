# Charts from project data

The Product Owner accepted the first column and line chart workflows in [PR #69](https://github.com/Koxora-Development/koxora/pull/69), merged on 2026-11-27 (`adb3689`). The active follow-up adds area and pie charts and updates from edited dataset cells. It addresses DIAG-017 and the initial local DATA-006 and DATA-009 workflows. Product Owner acceptance of the follow-up is pending. [Feature catalog](../product/feature-catalog.md)

## Create and edit a chart

1. Import a dataset through **File → Project data…**. On the canvas, open **Insert → Chart…**, choose a saved dataset and select **Insert chart**. If you need a dataset, choose **Open project data** from the chooser.
2. The chooser shows the suggested type and title. Studio selects the starting fields and uses the Studio palette. A text or boolean category suggests a column chart. A date or number category suggests a line chart.
3. Double-click the chart on the canvas or choose **Edit chart…** from its selection menu. Change the dataset, category column, separate numeric value column, type, title or **Studio**, **Ocean** or **Warm** palette and choose **Apply**. Move and resize the chart using the ordinary canvas tools.

## Area and pie charts

Insert suggests a column or line chart. To switch to **Area chart** or **Pie chart**, use **Edit chart…** on the canvas.

Every chart uses the first 100 input rows and reports the displayed count for longer datasets. Column, line and area charts follow source order. Empty category values have no label, and missing numeric values leave gaps. Area charts fill each continuous segment down to the zero baseline.

Pie charts skip missing and zero values and group positive values by their stored category, including a group for missing categories. Slices are ordered largest first, with equal totals in first-seen order. Studio shows up to six slices, using the five largest categories and an **Other** slice when seven or more contribute. Percentages use the sum of positive values within the displayed rows. Studio reports negative values or a lack of positive values in the chart area.

Each chart refers to its dataset fields by ID. Confirmed changes to saved dataset cells update the chart, and Undo and Redo restore the matching projection. Saving and reopening a project offline resolves the chart from the stored data. The chart archive profile preserves the type, palette and field roles. [Edit a saved value](delimited-data-import.md#edit-a-saved-value) · [Project format](../architecture/project-format.md#dataset-charts)

## Acceptance scenarios

- Open the chart chooser in an empty project and use it to open Project data. Import datasets with text, dates and numeric values, then choose one in Insert → Chart…. Check the starting title and type, then double-click to change the fields, title, type and palette.
- Check category order with an unsorted dataset and a missing value. Use more than 100 rows and verify the display count and the source-order limit.
- Change a line chart to an area chart. Check the zero baseline and each gap. Change it to a pie and check grouped categories, percentages and **Other**. Try a dataset with a negative value or with only zero and missing values and check the feedback.
- Edit a saved numeric cell and confirm that its bound chart updates. Check the matching value and chart after Undo and Redo.
- Move and resize a chart, change its configuration and check Undo and Redo. Reopen the exported `.koxora` project offline and verify its chart and data. Try removing the bound dataset and check that Studio protects the reference.
- Repeat creation and configuration with the keyboard in English and German.

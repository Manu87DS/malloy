/*
 * Copyright 2021 Google LLC
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

import { FieldDef, StructDef } from "@malloy-lang/malloy";
import { TopLevelSpec } from "vega-lite";
import { DataStyles, StyleDefaults } from "../data_styles";
import { Renderer } from "../renderer";
import { HTMLBarChartRenderer } from "./bar_chart";
import { HTMLBooleanRenderer } from "./boolean";
import { HTMLJSONRenderer } from "./json";
import { HTMLBytesRenderer } from "./bytes";
import { HTMLCurrencyRenderer } from "./currency";
import { HTMLPercentRenderer } from "./percent";
import { HTMLDashboardRenderer } from "./dashboard";
import { HTMLDateRenderer } from "./date";
import { HTMLLineChartRenderer } from "./line_chart";
import { HTMLLinkRenderer } from "./link";
import { HTMLListRenderer } from "./list";
import { HTMLListDetailRenderer } from "./list_detail";
import { HTMLNumberRenderer } from "./number";
import { HTMLPointMapRenderer } from "./point_map";
import { HTMLScatterChartRenderer } from "./scatter_chart";
import { HTMLSegmentMapRenderer } from "./segment_map";
import { HTMLShapeMapRenderer } from "./shape_map";
import { HTMLTableRenderer } from "./table";
import { HTMLTextRenderer } from "./text";
import { HTMLVegaSpecRenderer } from "./vega_spec";
import { DataTreeRoot } from "../data_table";
import { ContainerRenderer } from "./container";

export class HTMLView {
  async render(table: DataTreeRoot, dataStyles: DataStyles): Promise<string> {
    const renderer = makeRenderer(table.structDef, dataStyles, {
      size: "large",
    });
    try {
      // TODO Implement row streaming capability for some renderers: some renderers should be usable
      //      as a builder with `begin(field: StructDef)`, `row(field: StructDef, row: QueryDataRow)`,
      //      and `end(field: StructDef)` methods.
      //      Primarily, this should be possible for the `table` and `dashboard` renderers.
      //      This would only be used at this top level (and HTML view should support `begin`,
      //      `row`, and `end` as well).
      return await renderer.render(table, undefined);
    } catch (error) {
      if (error instanceof Error) {
        return error.toString();
      } else {
        return "Internal error - Exception not an Error object.";
      }
    }
  }
}

function getRendererOptions(field: FieldDef, dataStyles: DataStyles) {
  let renderer = dataStyles[field.name];
  if (!renderer && "resultMetadata" in field && field.resultMetadata) {
    for (const sourceClass of field.resultMetadata.sourceClasses) {
      if (!renderer) {
        renderer = dataStyles[sourceClass];
      }
    }
  }
  return renderer;
}

function isContainer(field: FieldDef): StructDef {
  if (field.type === "struct") {
    return field;
  } else {
    throw new Error(
      `${field.name} does not contain fields and cannot be rendered this way`
    );
  }
}

export function makeRenderer(
  field: FieldDef,
  dataStyles: DataStyles,
  styleDefaults: StyleDefaults
): Renderer {
  const renderDef = getRendererOptions(field, dataStyles) || {};

  if (renderDef.renderer === "shape_map" || field.name.endsWith("_shape_map")) {
    return new HTMLShapeMapRenderer(styleDefaults);
  } else if (
    renderDef.renderer === "point_map" ||
    field.name.endsWith("_point_map")
  ) {
    return new HTMLPointMapRenderer(styleDefaults);
  } else if (
    renderDef.renderer === "segment_map" ||
    field.name.endsWith("_segment_map")
  ) {
    return new HTMLSegmentMapRenderer(styleDefaults);
  } else if (
    renderDef.renderer === "dashboard" ||
    field.name.endsWith("_dashboard")
  ) {
    return ContainerRenderer.make(
      HTMLDashboardRenderer,
      isContainer(field),
      dataStyles
    );
  } else if (renderDef.renderer === "json" || field.name.endsWith("_json")) {
    return new HTMLJSONRenderer();
  } else if (
    renderDef.renderer === "line_chart" ||
    field.name.endsWith("_line_chart")
  ) {
    return new HTMLLineChartRenderer(styleDefaults);
  } else if (
    renderDef.renderer === "scatter_chart" ||
    field.name.endsWith("_scatter_chart")
  ) {
    return new HTMLScatterChartRenderer(styleDefaults);
  } else if (renderDef.renderer === "bar_chart") {
    return new HTMLBarChartRenderer(styleDefaults, renderDef);
  } else if (field.name.endsWith("_bar_chart")) {
    return new HTMLBarChartRenderer(styleDefaults, {});
  } else if (renderDef.renderer === "vega") {
    const spec = renderDef.spec;
    if (spec) {
      return new HTMLVegaSpecRenderer(styleDefaults, spec as TopLevelSpec);
    } else if (renderDef.spec_name) {
      const vegaRenderer = dataStyles[renderDef.spec_name];
      if (vegaRenderer !== undefined && vegaRenderer.renderer === "vega") {
        if (vegaRenderer.spec) {
          return new HTMLVegaSpecRenderer(
            styleDefaults,
            vegaRenderer.spec as TopLevelSpec
          );
        } else {
          throw new Error(`No spec defined on ${renderDef.spec_name}`);
        }
      } else {
        throw new Error(`No Vega renderer named ${renderDef.spec_name}`);
      }
    } else {
      throw new Error(`No top level vega spec defined for ${field.name}`);
    }
  } else {
    if (
      renderDef.renderer === "time" ||
      field.type === "date" ||
      field.type === "timestamp"
    ) {
      return new HTMLDateRenderer();
    } else if (renderDef.renderer === "currency") {
      return new HTMLCurrencyRenderer();
    } else if (renderDef.renderer === "percent") {
      return new HTMLPercentRenderer();
    } else if (renderDef.renderer === "number" || field.type === "number") {
      return new HTMLNumberRenderer();
    } else if (renderDef.renderer === "bytes") {
      return new HTMLBytesRenderer();
    } else if (renderDef.renderer === "boolean" || field.type === "boolean") {
      return new HTMLBooleanRenderer();
    } else if (renderDef.renderer === "link") {
      return new HTMLLinkRenderer();
    } else if (renderDef.renderer === "list") {
      return ContainerRenderer.make(
        HTMLListRenderer,
        isContainer(field),
        dataStyles
      );
    } else if (renderDef.renderer === "list_detail") {
      return ContainerRenderer.make(
        HTMLListDetailRenderer,
        isContainer(field),
        dataStyles
      );
    } else if (renderDef.renderer === "table" || field.type === "struct") {
      return ContainerRenderer.make(
        HTMLTableRenderer,
        isContainer(field),
        dataStyles
      );
    } else {
      return new HTMLTextRenderer();
    }
  }
}

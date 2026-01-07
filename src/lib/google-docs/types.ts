/**
 * Google Docs API Types
 *
 * Based on: https://developers.google.com/docs/api/reference/rest/v1/documents
 */

// Document structure
export interface GoogleDoc {
  documentId: string;
  title: string;
  body: Body;
  documentStyle?: DocumentStyle;
  namedStyles?: NamedStyles;
  revisionId?: string;
  inlineObjects?: Record<string, InlineObject>;
}

// Inline objects (images, etc.)
export interface InlineObject {
  objectId: string;
  inlineObjectProperties: InlineObjectProperties;
}

export interface InlineObjectProperties {
  embeddedObject: EmbeddedObject;
}

export interface EmbeddedObject {
  imageProperties?: ImageProperties;
  embeddedObjectBorder?: EmbeddedObjectBorder;
  size?: Size;
  title?: string;
  description?: string;
}

export interface ImageProperties {
  contentUri?: string;
  sourceUri?: string;
  brightness?: number;
  contrast?: number;
  cropProperties?: CropProperties;
}

export interface CropProperties {
  offsetLeft?: number;
  offsetRight?: number;
  offsetTop?: number;
  offsetBottom?: number;
  angle?: number;
}

export interface EmbeddedObjectBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: 'SOLID' | 'DOT' | 'DASH';
  propertyState?: 'RENDERED' | 'NOT_RENDERED';
}

export interface Size {
  height?: Dimension;
  width?: Dimension;
}

export interface Body {
  content: StructuralElement[];
}

export interface DocumentStyle {
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
}

export interface Dimension {
  magnitude: number;
  unit: 'PT' | 'MM' | 'INCH';
}

export interface NamedStyles {
  styles: NamedStyle[];
}

export interface NamedStyle {
  namedStyleType: NamedStyleType;
  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}

export type NamedStyleType =
  | 'NORMAL_TEXT'
  | 'TITLE'
  | 'SUBTITLE'
  | 'HEADING_1'
  | 'HEADING_2'
  | 'HEADING_3'
  | 'HEADING_4'
  | 'HEADING_5'
  | 'HEADING_6';

// Structural elements
export interface StructuralElement {
  startIndex: number;
  endIndex: number;
  paragraph?: Paragraph;
  sectionBreak?: SectionBreak;
  table?: Table;
  tableOfContents?: TableOfContents;
}

export interface Paragraph {
  elements: ParagraphElement[];
  paragraphStyle?: ParagraphStyle;
  bullet?: Bullet;
}

export interface ParagraphStyle {
  namedStyleType?: NamedStyleType;
  headingId?: string;
  alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
  indentFirstLine?: Dimension;
  indentStart?: Dimension;
  indentEnd?: Dimension;
  spaceAbove?: Dimension;
  spaceBelow?: Dimension;
}

export interface Bullet {
  listId: string;
  nestingLevel?: number;
  textStyle?: TextStyle;
}

export interface ParagraphElement {
  startIndex: number;
  endIndex: number;
  textRun?: TextRun;
  inlineObjectElement?: InlineObjectElement;
  horizontalRule?: HorizontalRule;
}

export interface TextRun {
  content: string;
  textStyle?: TextStyle;
}

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  smallCaps?: boolean;
  backgroundColor?: OptionalColor;
  foregroundColor?: OptionalColor;
  fontSize?: Dimension;
  weightedFontFamily?: WeightedFontFamily;
  baselineOffset?: 'NONE' | 'SUPERSCRIPT' | 'SUBSCRIPT';
  link?: Link;
}

export interface OptionalColor {
  color?: Color;
}

export interface Color {
  rgbColor?: RgbColor;
}

export interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

export interface WeightedFontFamily {
  fontFamily: string;
  weight: number;
}

export interface Link {
  url?: string;
  bookmarkId?: string;
  headingId?: string;
}

export interface InlineObjectElement {
  inlineObjectId: string;
  textStyle?: TextStyle;
}

export interface HorizontalRule {
  textStyle?: TextStyle;
}

export interface SectionBreak {
  sectionStyle?: SectionStyle;
}

export interface SectionStyle {
  columnSeparatorStyle?: 'NONE' | 'BETWEEN_EACH_COLUMN';
  contentDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
}

export interface Table {
  rows: number;
  columns: number;
  tableRows: TableRow[];
  tableStyle?: TableStyle;
}

export interface TableRow {
  startIndex: number;
  endIndex: number;
  tableCells: TableCell[];
  tableRowStyle?: TableRowStyle;
}

export interface TableCell {
  startIndex: number;
  endIndex: number;
  content: StructuralElement[];
  tableCellStyle?: TableCellStyle;
}

export interface TableStyle {
  tableColumnProperties: TableColumnProperties[];
}

export interface TableColumnProperties {
  widthType: 'EVENLY_DISTRIBUTED' | 'FIXED_WIDTH';
  width?: Dimension;
}

export interface TableRowStyle {
  minRowHeight?: Dimension;
}

export interface TableCellStyle {
  backgroundColor?: OptionalColor;
  borderLeft?: TableCellBorder;
  borderRight?: TableCellBorder;
  borderTop?: TableCellBorder;
  borderBottom?: TableCellBorder;
  paddingLeft?: Dimension;
  paddingRight?: Dimension;
  paddingTop?: Dimension;
  paddingBottom?: Dimension;
}

export interface TableCellBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: 'SOLID' | 'DOT' | 'DASH';
}

export interface TableOfContents {
  content: StructuralElement[];
}

// Article index (from Google Sheets)
export interface ArticleIndexEntry {
  documentId: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  icon?: string;
  keywords?: string[];
  published: boolean;
}

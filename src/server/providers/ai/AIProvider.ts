/**
 * Reserved interface for the future AI content layer. Not implemented in MVP.
 *
 * Planned generations: property descriptions, marketing copy, broker emails,
 * OM summaries, social captions, market overviews. Implementations will plug
 * into the marketing data resolver to populate `generatedContent` fields in
 * the render context — no renderer or schema changes required.
 */
export interface AIProvider {
  readonly name: string;
  generate(req: {
    kind:
      | "property-description"
      | "marketing-copy"
      | "broker-email"
      | "om-summary"
      | "social-caption"
      | "market-overview";
    context: Record<string, unknown>;
  }): Promise<string>;
}

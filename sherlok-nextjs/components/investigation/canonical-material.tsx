import type { components } from "@/lib/generated/investigation-api.v1";

type CaseFile = components["schemas"]["CaseFile"];
type MaterialBlock = components["schemas"]["CaseMaterialBlock"];
type SourceReference = components["schemas"]["SourceReference"];

export function CanonicalMaterial({ caseFile }: { caseFile: CaseFile }) {
  const blocks = caseFile.material_blocks ?? [];

  return (
    <section aria-label="Canonical case material" className="mt-8 rounded-lg border border-[#d8c4a0] bg-[#fbf2de] p-5">
      <h2 className="font-serif text-[27px] font-semibold text-[#121b25]">Canonical case material</h2>
      <p className="mt-1 text-sm text-[#5c5145]">Curated participant material in its supplied order.</p>
      {blocks.length > 0 ? <ol className="mt-5 space-y-4">{blocks.map((block) => <MaterialBlockView block={block} key={block.id} />)}</ol> : <CanonicalMaterialFallback material={caseFile.canonical_material} />}
      <MaterialWarnings warnings={caseFile.material_warnings ?? []} />
    </section>
  );
}

function MaterialBlockView({ block }: { block: MaterialBlock }) {
  const nestingStyle = block.nesting > 0 ? { marginInlineStart: `${block.nesting}rem` } : undefined;

  return (
    <li className="rounded-lg border border-[#d8c4a0] bg-[#fff8e9] p-4" style={nestingStyle}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#745022]">{block.kind.replaceAll("_", " ")}</p>
      <SourceLocation reference={block.source_reference} />
      {block.table ? <MaterialTable block={block} /> : <p className="mt-3 whitespace-pre-wrap leading-6 text-[#1e2831]">{block.text}</p>}
    </li>
  );
}

function MaterialTable({ block }: { block: MaterialBlock }) {
  const table = block.table;

  if (!table) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      {table.is_uncertain && <p className="mb-3 rounded border border-[#e6a522] bg-[#f6deaa] px-3 py-2 text-sm font-semibold text-[#704a00]">Table structure is uncertain.</p>}
      <table aria-label={table.title || block.text || "Canonical material table"} className="min-w-full border-collapse text-left text-sm">
        {table.title && <caption className="mb-2 text-left font-serif text-lg font-semibold text-[#121b25]">{table.title}</caption>}
        <thead><tr>{table.headers.map((header, index) => <th className="border border-[#d8c4a0] bg-[#f4e8d0] px-3 py-2 font-semibold" key={`${header}-${index}`} scope="col">{header}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={`${block.id}-${rowIndex}`}>{row.map((cell, columnIndex) => <td className="border border-[#d8c4a0] px-3 py-2" key={`${cell}-${columnIndex}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
      <TableReferences table={table} />
    </div>
  );
}

function TableReferences({ table }: { table: NonNullable<MaterialBlock["table"]> }) {
  const references = [...table.header_references, ...table.row_references, ...table.cell_references.flat()];

  if (references.length === 0) return null;

  return <div className="mt-3"><p className="text-sm font-semibold text-[#121b25]">Table source references</p><ReferenceList references={references} /></div>;
}

function CanonicalMaterialFallback({ material }: { material: string | null | undefined }) {
  if (!material) return <p className="mt-5 text-sm text-[#5c5145]">No canonical case material is available for this Case File.</p>;

  return <p className="mt-5 whitespace-pre-wrap leading-6 text-[#1e2831]">{material}</p>;
}

function MaterialWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return <aside className="mt-5 rounded border border-[#b3261e] bg-[#fce5db] p-4 text-[#1e2831]" role="alert"><h3 className="font-serif text-lg font-semibold">Material warnings</h3><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></aside>;
}

function SourceLocation({ reference }: { reference: SourceReference }) {
  return <div className="mt-2 text-sm text-[#5c5145]"><span className="font-semibold text-[#1e2831]">{reference.source_name}</span><ReferenceList references={[reference]} /></div>;
}

function ReferenceList({ references }: { references: SourceReference[] }) {
  return <ul className="mt-1 space-y-1">{references.map((reference, index) => <li key={`${reference.block_id}-${index}`}>{referenceLabel(reference)}</li>)}</ul>;
}

function referenceLabel(reference: SourceReference) {
  const location = [
    reference.heading,
    reference.page && `page ${reference.page}`,
    reference.paragraph && `paragraph ${reference.paragraph}`,
    reference.list_position,
    reference.table_row && `table row ${reference.table_row}`,
    reference.table_column && `table column ${reference.table_column}`,
  ].filter(Boolean);

  return location.join(" · ") || "Source location available";
}
